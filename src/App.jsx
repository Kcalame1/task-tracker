
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import './App.css'

function App() {
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [projectName, setProjectName] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('Medium')
  const [dueDate, setDueDate] = useState('')
  const [projectId, setProjectId] = useState('')
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    )

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) loadData()
  }, [session])

  async function loadData() {
    const { data: projectData, error: projectError } =
      await supabase.from('projects').select('*').order('created_at')

    if (projectError) {
      setMessage(projectError.message)
      return
    }

    setProjects(projectData || [])

    const { data: taskData, error: taskError } =
      await supabase.from('tasks').select('*').order('created_at', { ascending: false })

    if (taskError) {
      setMessage(taskError.message)
      return
    }

    setTasks(taskData || [])
  }

  async function handleAuth(e) {
    e.preventDefault()
    setMessage('')

    const result = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })

    if (result.error) {
      setMessage(result.error.message)
    } else if (!isLogin && !result.data.session) {
      setMessage('Account created! Check your email to confirm your account, then log in.')
    } else {
      setMessage(isLogin ? 'Welcome back!' : 'Account created!')
    }
  }

  async function addProject(e) {
    e.preventDefault()
    if (!projectName.trim()) return setMessage('Enter a project name.')

    const { error } = await supabase.from('projects').insert({
      name: projectName.trim()
    })

    if (error) {
      setMessage(error.message)
    } else {
      setProjectName('')
      setMessage('Project added!')
      loadData()
    }
  }

  async function saveTask(e) {
    e.preventDefault()

    if (!title.trim()) return setMessage('Please enter a task title.')
    if (!projectId) return setMessage('Please create and select a project.')

    const task = {
      title: title.trim(),
      description: description.trim(),
      priority,
      due_date: dueDate || null,
      project_id: Number(projectId)
    }

    const result = editingId
      ? await supabase.from('tasks').update(task).eq('id', editingId)
      : await supabase.from('tasks').insert(task)

    if (result.error) {
      setMessage(result.error.message)
    } else {
      setMessage(editingId ? 'Task updated!' : 'Task added!')
      clearForm()
      loadData()
    }
  }

  function editTask(task) {
    setEditingId(task.id)
    setTitle(task.title)
    setDescription(task.description || '')
    setPriority(task.priority || 'Medium')
    setDueDate(task.due_date || '')
    setProjectId(String(task.project_id))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deleteTask(id) {
    if (!window.confirm('Are you sure you want to delete this task?')) return

    const { error } = await supabase.from('tasks').delete().eq('id', id)

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Task deleted.')
      loadData()
    }
  }

  async function changeStatus(task) {
    const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed'

    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', task.id)

    if (error) {
      setMessage(error.message)
    } else {
      loadData()
    }
  }

  function clearForm() {
    setTitle('')
    setDescription('')
    setPriority('Medium')
    setDueDate('')
    setProjectId('')
    setEditingId(null)
  }

  async function logout() {
    await supabase.auth.signOut()
    setTasks([])
    setProjects([])
  }

  if (!session) {
    return (
      <main className="login-page">
        <form className="login-card" onSubmit={handleAuth}>
          <h1>My Task Tracker</h1>
          <p>Keep track of your daily tasks.</p>

          <label>Email</label>
          <input type="email" value={email}
            onChange={e => setEmail(e.target.value)} required />

          <label>Password</label>
          <input type="password" value={password}
            onChange={e => setPassword(e.target.value)}
            minLength={6} required />

          <button type="submit">{isLogin ? 'Log In' : 'Sign Up'}</button>

          <p className="switch">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
            <button type="button" className="link"
              onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? ' Sign Up' : ' Log In'}
            </button>
          </p>

          {message && <p className="message">{message}</p>}
        </form>
      </main>
    )
  }

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <main className="container">
      <header>
        <div>
          <h1>My Task Tracker</h1>
          <p>Organize your projects and tasks.</p>
        </div>
        <button className="logout" onClick={logout}>Log Out</button>
      </header>

      {message && <p className="message">{message}</p>}

      <section className="stats">
        <div className="stat-card">
          <h2>{tasks.length}</h2>
          <p>Total Tasks</p>
        </div>
        <div className="stat-card">
          <h2>{tasks.filter(t => t.status === 'Completed').length}</h2>
          <p>Completed</p>
        </div>
        <div className="stat-card">
          <h2>{tasks.filter(t => t.status !== 'Completed').length}</h2>
          <p>Pending</p>
        </div>
      </section>

      <section className="panel">
        <h2>Create a Project</h2>
        <form onSubmit={addProject} className="project-form">
          <input placeholder="Project name" value={projectName}
            onChange={e => setProjectName(e.target.value)} required />
          <button type="submit">Add Project</button>
        </form>
      </section>

      <section className="panel">
        <h2>{editingId ? 'Edit Task' : 'Add a New Task'}</h2>
        <form onSubmit={saveTask} className="task-form">
          <label>Task Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Enter task title" required />

          <label>Description</label>
          <textarea value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe your task" />

          <label>Project</label>
          <select value={projectId}
            onChange={e => setProjectId(e.target.value)} required>
            <option value="">Choose a project</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          <label>Priority</label>
          <select value={priority}
            onChange={e => setPriority(e.target.value)}>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>

          <label>Due Date</label>
          <input type="date" value={dueDate}
            onChange={e => setDueDate(e.target.value)} />

          <div className="form-buttons">
            <button type="submit">{editingId ? 'Save Changes' : 'Add Task'}</button>
            {editingId && <button type="button" className="cancel"
              onClick={clearForm}>Cancel</button>}
          </div>
        </form>
      </section>

      <section className="panel">
        <h2>My Tasks</h2>
        <input className="search" placeholder="Search tasks..."
          value={search} onChange={e => setSearch(e.target.value)} />

        {filteredTasks.length === 0 && <p>No tasks found. Add a task above!</p>}

        {filteredTasks.map(task => {
          const project = projects.find(p => p.id === task.project_id)

          return (
            <div className="task-card" key={task.id}>
              <div className="task-info">
                <h3>{task.title}</h3>
                <p>{task.description}</p>
                <small>Project: {project?.name || 'Unknown'}</small>
                <p>
                  Priority: {task.priority} | Due: {task.due_date || 'No date'}
                </p>
                <span className={task.status === 'Completed' ? 'completed' : 'pending'}>
                  {task.status}
                </span>
              </div>

              <div className="task-actions">
                <button onClick={() => changeStatus(task)}>
                  {task.status === 'Completed' ? 'Reopen' : 'Complete'}
                </button>
                <button className="edit" onClick={() => editTask(task)}>Edit</button>
                <button className="delete" onClick={() => deleteTask(task.id)}>Delete</button>
              </div>
            </div>
          )
        })}
      </section>
    </main>
  )
}

export default App
