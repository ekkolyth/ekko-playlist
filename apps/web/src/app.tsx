import { getRouter } from './router'
import { RouterProvider } from '@tanstack/react-router'

function App() {
  return <RouterProvider router={getRouter()} />
}

export default App

