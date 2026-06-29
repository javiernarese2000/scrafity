import { H2, LegalPage } from "@/components/legal/legal-page";

export const metadata = { title: "Términos del Servicio · Zoocial" };

export default function TermsPage() {
  return (
    <LegalPage title="Términos del Servicio" actualizado="29 de junio de 2026">
      <p>
        Zoocial es una herramienta para crear videos (con logo y zócalo) y
        publicarlos en redes sociales como Facebook, Instagram y TikTok en nombre
        del usuario. Al usar Zoocial aceptás estos términos.
      </p>

      <H2>1. Uso del servicio</H2>
      <p>
        Zoocial es una plataforma interna para equipos que gestionan contenido de
        sus propias marcas o clientes. Te comprometés a usarla de forma lícita y a
        publicar únicamente contenido sobre el cual tenés derechos.
      </p>

      <H2>2. Cuentas y conexiones</H2>
      <p>
        Para publicar, conectás tus cuentas de redes sociales mediante el inicio de
        sesión oficial de cada plataforma (Meta, TikTok). Los tokens de acceso se
        guardan cifrados y se usan solo para publicar el contenido que vos indicás.
        Podés desconectar una cuenta en cualquier momento.
      </p>

      <H2>3. Contenido</H2>
      <p>
        El contenido que subís es tuyo. Nos otorgás permiso para procesarlo (render
        de video) y publicarlo en las redes que elijas, en tu nombre. Sos
        responsable del contenido y de cumplir con las políticas de cada red social.
      </p>

      <H2>4. Plataformas de terceros</H2>
      <p>
        La publicación se realiza a través de las APIs de Meta y TikTok. El uso de
        esas plataformas está sujeto a sus propios términos y políticas. Zoocial no
        se responsabiliza por cambios, límites o decisiones de moderación de
        terceros.
      </p>

      <H2>5. Disponibilidad y responsabilidad</H2>
      <p>
        El servicio se ofrece &laquo;tal cual&raquo;, sin garantías de
        disponibilidad ininterrumpida. En la medida que lo permita la ley, Zoocial
        no será responsable por daños indirectos derivados del uso del servicio.
      </p>

      <H2>6. Cambios</H2>
      <p>
        Podemos actualizar estos términos. Los cambios relevantes se reflejarán en
        esta página con su fecha de actualización.
      </p>

      <H2>7. Contacto</H2>
      <p>
        Por consultas: <a className="text-accent hover:underline" href="mailto:narese@gmail.com">narese@gmail.com</a>.
      </p>
    </LegalPage>
  );
}
