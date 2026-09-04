import AgentHubNavbar from '@/components/AgentHubNavbar';
import Footer from '@/components/Footer';

export default function AgentHubShell({ children, profile = null }) {
  return (
    <div className="min-h-screen">
      <AgentHubNavbar profile={profile} />
      {children}
      <Footer />
    </div>
  );
}
