import { Layout } from '@/components/Layout'
import { UpdateDialog } from '@/components/UpdateDialog'
import { useAutoUpdate } from '@/hooks/useAutoUpdate'

function App(): React.JSX.Element {
  const updater = useAutoUpdate()

  return (
    <>
      <Layout onCheckUpdate={updater.checkForUpdate} isCheckingUpdate={updater.checking} />
      <UpdateDialog updater={updater} />
    </>
  )
}

export default App
