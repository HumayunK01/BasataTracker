import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <div className="text-center animate-fade-in">
        <h1 className="mb-4 text-4xl font-semibold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <Link to="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
