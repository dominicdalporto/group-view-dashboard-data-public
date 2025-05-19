import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

type SidebarNavItemProps = {
  title: string;
  href: string;
  icon: React.ElementType;
  external?: boolean;
  sidebarOpen: boolean;
};

export function SidebarNavItem({
  title,
  href,
  icon: Icon,
  external = false,
  sidebarOpen,
}: SidebarNavItemProps) {
  const navigate = useNavigate();

  const commonClasses = `h-5 w-5 ${!sidebarOpen ? "mx-auto" : ""}`;
  const label = sidebarOpen ? <span className="ml-3">{title}</span> : null;

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`w-full flex items-center ${
          sidebarOpen ? "justify-start" : "justify-center"
        } mb-1 px-3 py-2 text-sm text-black-700 hover:bg-gray-100 rounded`}
      >
        <Icon className={commonClasses} />
        {label}
      </a>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`w-full ${
        sidebarOpen ? "justify-start" : "justify-center"
      } mb-1`}
      onClick={() => navigate(href)}
    >
      <Icon className={commonClasses} />
      {label}
    </Button>
  );
}
