import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, FolderOpen, Image, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface NavLinkItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}

const NavLinkItem = ({ to, icon, label, isActive, onClick }: NavLinkItemProps & { onClick?: () => void }) => {
  const content = (
    <motion.div
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors cursor-pointer",
        isActive
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
      {icon}
      <span className="font-medium text-sm">{label}</span>
    </motion.div>
  );

  if (onClick) {
    return (
      <div className="relative">
        {content}
        {isActive && (
          <motion.div
            layoutId="nav-indicator"
            className="absolute inset-0 bg-secondary rounded-lg -z-10"
            initial={false}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
          />
        )}
      </div>
    );
  }

  return (
    <Link to={to} className="relative">
      {content}
      {isActive && (
        <motion.div
          layoutId="nav-indicator"
          className="absolute inset-0 bg-secondary rounded-lg -z-10"
          initial={false}
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}
    </Link>
  );
};

export const TopNav = () => {
  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();
  const { projects } = useAppStore();
  const [showProjectDialog, setShowProjectDialog] = useState(false);

  const handleEditorClick = () => {
    if (projects.length === 0) {
      // No projects, go to dashboard
      navigate("/");
    } else if (projects.length === 1) {
      // Only one project, go directly to it
      navigate(`/editor/${projects[0].id}`);
    } else {
      // Multiple projects, show dialog
      setShowProjectDialog(true);
    }
  };

  const links = [
    { to: "/", icon: <Calendar className="w-4 h-4" />, label: "Dashboard" },
    { to: "/editor", icon: <FolderOpen className="w-4 h-4" />, label: "Editor", onClick: handleEditorClick },
    { to: "/library", icon: <Image className="w-4 h-4" />, label: "Library" },
    { to: "/settings", icon: <Settings className="w-4 h-4" />, label: "Settings" },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 glass-panel border-b">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Calendar className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display font-semibold text-lg hidden sm:block">
                Calendar Maker
              </span>
            </Link>

            {/* Nav Links */}
            <nav className="hidden md:flex items-center gap-1">
              {links.map((link) => (
                <NavLinkItem
                  key={link.to}
                  {...link}
                  isActive={
                    link.to === "/"
                      ? pathname === "/"
                      : pathname.startsWith(link.to)
                  }
                />
              ))}
            </nav>
          </div>

        </div>
      </header>

      {/* Project Selection Dialog */}
      <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No projects available. Create a project from the Dashboard.
              </p>
            ) : (
              projects.map((project) => (
                <Button
                  key={project.id}
                  variant="outline"
                  className="w-full justify-start h-auto p-4"
                  onClick={() => {
                    navigate(`/editor/${project.id}`);
                    setShowProjectDialog(false);
                  }}
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-medium">{project.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {project.calendarType === "wall" ? "Wall Calendar" : "Desk Calendar"} •{" "}
                      {project.format.width}×{project.format.height}
                      {project.format.unit}
                    </span>
                  </div>
                </Button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const MobileNav = () => {
  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();
  const { projects } = useAppStore();
  const [showProjectDialog, setShowProjectDialog] = useState(false);

  const handleEditorClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (projects.length === 0) {
      navigate("/");
    } else if (projects.length === 1) {
      navigate(`/editor/${projects[0].id}`);
    } else {
      setShowProjectDialog(true);
    }
  };

  const links = [
    { to: "/", icon: <Calendar className="w-5 h-5" />, label: "Home" },
    { to: "/editor", icon: <FolderOpen className="w-5 h-5" />, label: "Editor", onClick: handleEditorClick },
    { to: "/library", icon: <Image className="w-5 h-5" />, label: "Library" },
    { to: "/settings", icon: <Settings className="w-5 h-5" />, label: "Settings" },
  ];

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-panel border-t">
        <div className="flex items-center justify-around h-16 px-2">
          {links.map((link) => {
            const isActive =
              link.to === "/" ? pathname === "/" : pathname.startsWith(link.to);
            if (link.onClick) {
              return (
                <button
                  key={link.to}
                  onClick={link.onClick}
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {link.icon}
                  <span className="text-xs font-medium">{link.label}</span>
                </button>
              );
            }
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.icon}
                <span className="text-xs font-medium">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Project Selection Dialog */}
      <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No projects available. Create a project from the Dashboard.
              </p>
            ) : (
              projects.map((project) => (
                <Button
                  key={project.id}
                  variant="outline"
                  className="w-full justify-start h-auto p-4"
                  onClick={() => {
                    navigate(`/editor/${project.id}`);
                    setShowProjectDialog(false);
                  }}
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-medium">{project.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {project.calendarType === "wall" ? "Wall Calendar" : "Desk Calendar"} •{" "}
                      {project.format.width}×{project.format.height}
                      {project.format.unit}
                    </span>
                  </div>
                </Button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
