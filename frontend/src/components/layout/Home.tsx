import { Link } from 'react-router-dom'

const Home = () => {
  return (
    <div className="flex flex-col items-center justify-center space-y-8 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
        Welcome to the Game
      </h1>
      <p className="max-w-[600px] text-lg text-muted-foreground">
        Challenge yourself or play against friends in this exciting game. Test your skills and compete for the top spot on the leaderboard.
      </p>
      <Link
        to="/game"
        className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
      >
        Start Playing
      </Link>
    </div>
  )
}

export default Home 