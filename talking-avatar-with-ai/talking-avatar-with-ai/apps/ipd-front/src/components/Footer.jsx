export const Footer = () => {
  return (
    <footer className="bg-muted/50 text-foreground text-sm py-8 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
        
        <div className="text-center md:text-left">
          <h2 className="text-foreground font-semibold text-lg mb-1">Avatar Ask</h2>
          <p className="text-xs text-muted-foreground">Future of AI-powered education</p>
        </div>

        <div className="text-center">
          <p className="text-foreground font-semibold mb-1">Contributors</p>
          <p className="text-xs text-muted-foreground">Omkar · Harsh B · Maitri · Harsh J</p>
        </div>

        <div className="text-center md:text-right">
          <p className="text-foreground font-semibold mb-1">Contact Us</p>
          <a href="mailto:info@avatarask.com" className="text-primary hover:text-primary/80 text-xs transition-colors">
            info@avatarask.com
          </a>
        </div>
      </div>

      <div className="text-center text-xs mt-6 border-t border-border pt-4 text-muted-foreground">
        © {new Date().getFullYear()} Avatar Ask. All rights reserved.
      </div>
    </footer>
  );
};