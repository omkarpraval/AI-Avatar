import React from "react";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className="w-full bg-background/80 backdrop-blur-xl sticky top-0 z-30 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
        <Link
          to="/"
          className="font-extrabold text-3xl md:text-4xl text-foreground select-none tracking-wide"
        >
          Avatar&nbsp;<span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Ask</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-base font-medium text-foreground hover:text-primary transition-colors">Home</Link>
          <Link to="/#avatars" className="text-base font-medium text-foreground hover:text-primary transition-colors">Avatars</Link>
          <Link to="/about" className="text-base font-medium text-foreground hover:text-primary transition-colors">About</Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;