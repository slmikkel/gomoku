import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import ThemeToggle from '../ui/ThemeToggle'
import {Tooltip} from "react-tooltip";

const Navigation = () => {
  const { token, user, logout } = useAuthStore()

  return (
    <nav className="bg-navbg">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="text-xl font-bold">
          Gomoku
        </Link>

        <div className="flex items-center gap-8">
          {token && (
            <div className="flex items-center gap-8">
              <Tooltip id="local-game-tooltip" content={"Local Game"} />
              <Link
                  to="/game"
                  data-tooltip-id={"local-game-tooltip"}
                  className="text-2xl text-primary hover:scale-125"
              >
                ♟
              </Link>
              <Tooltip id="network-game-tooltip" content={"Local Game"} />
              <Link
                to="/network"
                data-tooltip-id={"network-game-tooltip"}
                className="text-2xl text-primary hover:scale-125"
              >
                🌐
              </Link>
            </div>
          )}
          
          {token ? (
            <>
              <span className="text-sm text-muted-foreground">
                Welcome, {user?.username}
              </span>
              <button
                onClick={logout}
                className="text-sm text-primary hover:underline"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm text-primary hover:underline"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="text-sm text-primary hover:underline"
              >
                Register
              </Link>
            </>
          )}
          <ThemeToggle />
        </div>
      </div>
    </nav>
  )
}

export default Navigation 