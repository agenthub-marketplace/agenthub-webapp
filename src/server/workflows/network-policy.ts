import { BlockList, isIP } from "node:net";

const reseauxInterdits = new BlockList();
// Un préfixe textuel ne couvre pas un réseau entier (ex. 100.64.0.0/10).
for (const [adresse, prefixe] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10],
  ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12],
  ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16],
  ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24],
  ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) reseauxInterdits.addSubnet(adresse, prefixe, "ipv4");

const reseauxIpv6Publics = new BlockList();
reseauxIpv6Publics.addSubnet("2000::", 3, "ipv6");
// Politique prudente : pas de tunnels, d'adresses spéciales ou de documentation.
for (const [adresse, prefixe] of [["2001::", 23], ["2001:db8::", 32], ["2002::", 16], ["3fff::", 20]] as const) {
  reseauxInterdits.addSubnet(adresse, prefixe, "ipv6");
}

export function isBlockedWorkflowHostname(hostname: string): boolean {
  const adresse = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  const famille = isIP(adresse);
  if (famille === 4) return reseauxInterdits.check(adresse, "ipv4");
  // Les formes IPv4 encapsulées et les réseaux locaux IPv6 sont refusés par défaut.
  if (famille === 6) return !reseauxIpv6Publics.check(adresse, "ipv6") || reseauxInterdits.check(adresse, "ipv6");
  // Un nom DNS doit encore être résolu et TOUTES ses adresses contrôlées avant connexion.
  return adresse === "localhost" || adresse.endsWith(".localhost") || adresse.includes(":");
}
