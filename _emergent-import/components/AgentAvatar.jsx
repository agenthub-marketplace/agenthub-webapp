import { avatarGradients } from '@/lib/mock-data';

export default function AgentAvatar({ index = 0, size = 'md', className = '' }) {
  const sizes = {
    xs: 'w-8 h-8 text-xs',
    sm: 'w-10 h-10 text-sm',
    md: 'w-14 h-14 text-base',
    lg: 'w-24 h-24 text-2xl',
    xl: 'w-40 h-40 text-4xl',
  };
  const g = avatarGradients[index % avatarGradients.length];
  return (
    <div className={`relative rounded-2xl bg-gradient-to-br ${g} ${sizes[size]} ${className} overflow-hidden`}>
      <div className="absolute inset-0 opacity-40" style={{ background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent 50%)' }} />
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '8px 8px' }} />
    </div>
  );
}
