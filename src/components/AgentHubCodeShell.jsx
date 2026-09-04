import AgentHubCodeNavbar from '@/components/AgentHubCodeNavbar';
import Footer from '@/components/Footer';

export default function AgentHubCodeShell({ children, profile = null }) {
  return (
    <div className="code-theme min-h-screen bg-[#F7F8FC] text-[#111827]">
      <AgentHubCodeNavbar profile={profile} />
      {children}
      <Footer variant="code" />
    </div>
  );
}
