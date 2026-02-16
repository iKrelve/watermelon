import { Button } from '@/components/ui/button'

function App(): React.JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="text-center">
        <h1 className="mb-4 text-5xl font-bold text-white">Watermelon</h1>
        <p className="mb-8 text-lg text-slate-400">
          Powered by Electron + React + Vite + Bun
        </p>
        <div className="mb-8 flex justify-center gap-4">
          <span className="rounded-full bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-400">
            Electron v40
          </span>
          <span className="rounded-full bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-400">
            React v19
          </span>
          <span className="rounded-full bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-400">
            Vite v7
          </span>
          <span className="rounded-full bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400">
            Bun
          </span>
        </div>
        <div className="flex justify-center gap-3">
          <Button variant="default">Get Started</Button>
          <Button variant="outline">Documentation</Button>
          <Button variant="secondary">GitHub</Button>
        </div>
      </div>
    </div>
  )
}

export default App
