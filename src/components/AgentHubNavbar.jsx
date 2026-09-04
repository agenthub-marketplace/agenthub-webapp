'use client';

import Navbar from '@/components/Navbar';

export default function AgentHubNavbar({ profile = null }) {
  return <Navbar experience="agenthub" profile={profile} />;
}
