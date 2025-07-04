import { Toaster } from '../ui/toaster'
import Navigation from './Navigation'

interface LayoutProps {
  children: React.ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="bg-mainbg">{children}</main>
      <Toaster />
    </div>
  )
}

export default Layout 