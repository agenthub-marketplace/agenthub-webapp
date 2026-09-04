'use client';

import Navbar from '@/components/Navbar';

export default function AgentHubCodeNavbar({ profile = null }) {
  return <Navbar experience="code" profile={profile} />;
}
