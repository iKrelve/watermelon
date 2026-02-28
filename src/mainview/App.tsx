import { Layout } from '@/components/Layout'
import { UpdateDialog } from '@/components/UpdateDialog'
import { useAutoUpdate } from '@/hooks/useAutoUpdate'

function App(): React.JSX.Element {
  const updater = useAutoUpdate()

  return (
    <>
      <Layout />
      <UpdateDialog updater={updater} />
    </>
  )
}

export default App
