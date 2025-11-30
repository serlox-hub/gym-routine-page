import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-surface text-primary">
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
