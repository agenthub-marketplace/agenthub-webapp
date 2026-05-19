'use client';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit3 } from 'lucide-react';
import { useParams } from 'next/navigation';

function EditAgentPage() {
  const { id } = useParams();
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-10 max-w-3xl">
        <Link href="/creator/dashboard" className="inline-flex items-center gap-1.5 text-sm text-[#9B72CF] hover:text-[#F4EFFA] mb-6"><ArrowLeft className="w-4 h-4"/>Retour au tableau de bord</Link>
        <div className="bg-[#0F0A1E] border border-[#2F184B] rounded-2xl p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#532B88] to-[#7C3AED] flex items-center justify-center mx-auto mb-4 glow-primary">
            <Edit3 className="w-8 h-8 text-white"/>
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-bold mb-2">Modifier l’agent</h1>
          <p className="text-[#C8B1E4] mb-6">Vous éditez : <span className="text-[#F4EFFA] font-display font-semibold">{id}</span></p>
          <p className="text-sm text-[#9B72CF] mb-6">L’éditeur réutilise le même formulaire en 7 étapes que la création, avec les valeurs actuelles pré-remplies.</p>
          <Link href="/creator/agents/new"><Button className="bg-[#532B88] hover:bg-[#7C3AED] text-white border-0 glow-soft">Ouvrir l’éditeur</Button></Link>
        </div>
      </div>
    </div>
  );
}

export default EditAgentPage;
