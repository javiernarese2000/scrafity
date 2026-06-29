import { H2, LegalPage } from "@/components/legal/legal-page";

export const metadata = { title: "Política de Privacidad · Zoocial" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de Privacidad" actualizado="29 de junio de 2026">
      <p>
        Esta política explica qué datos maneja Zoocial y cómo los usamos. Zoocial es
        una herramienta para crear y publicar videos en redes sociales en nombre del
        usuario.
      </p>

      <H2>1. Qué datos recopilamos</H2>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Datos de cuenta:</strong> email y nombre del usuario del panel.
        </li>
        <li>
          <strong>Conexiones de redes:</strong> tokens de acceso de las cuentas que
          conectás (Meta, TikTok), guardados <strong>cifrados</strong> (AES-256-GCM).
        </li>
        <li>
          <strong>Contenido:</strong> los videos que subís y el texto/caption que
          escribís para publicar.
        </li>
        <li>
          <strong>Registros de actividad:</strong> quién hizo qué y cuándo dentro del
          panel (auditoría interna).
        </li>
      </ul>

      <H2>2. Cómo usamos los datos</H2>
      <p>
        Usamos estos datos únicamente para prestar el servicio: renderizar tus
        videos, programarlos y publicarlos en las redes que elijas, y mostrar el
        estado de las publicaciones.
      </p>

      <H2>3. Terceros con los que compartimos datos</H2>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Meta (Facebook/Instagram)</strong> y <strong>TikTok</strong>:
          enviamos tu video y caption a sus APIs para publicar en tu nombre, usando
          los tokens que autorizaste.
        </li>
        <li>
          <strong>Supabase</strong>: proveedor de base de datos, autenticación y
          almacenamiento de los videos.
        </li>
      </ul>
      <p>No vendemos tus datos a terceros.</p>

      <H2>4. Retención</H2>
      <p>
        Los videos originales que subís se eliminan automáticamente a los 14 días
        (el resultado renderizado y las miniaturas se conservan mientras la
        publicación exista). Podés solicitar la eliminación de tu cuenta y tus datos
        en cualquier momento.
      </p>

      <H2>5. Seguridad</H2>
      <p>
        Los tokens de las redes se almacenan cifrados. El acceso al panel requiere
        usuario y contraseña, y las acciones quedan registradas.
      </p>

      <H2>6. Tus derechos</H2>
      <p>
        Podés acceder, corregir o eliminar tus datos escribiéndonos. Al desconectar
        una cuenta de red social, dejamos de tener acceso a ella.
      </p>

      <H2>7. Contacto</H2>
      <p>
        Por consultas sobre privacidad:{" "}
        <a className="text-accent hover:underline" href="mailto:narese@gmail.com">
          narese@gmail.com
        </a>
        .
      </p>
    </LegalPage>
  );
}
