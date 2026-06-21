// Datos de prueba para la cola de moderación. Se reemplazan por queries reales.

export type VersionMock = {
  id: string;
  titulo: string;
  contenido: string;
  similarity: number; // 0..1 respecto del original
  proveedor: "DeepSeek" | "Claude";
  tokensIn: number;
  tokensOut: number;
  costo: number;
};

export type NotaModeracion = {
  id: string;
  titulo: string;
  fuente: string;
  tema: "Política" | "Economía" | "Sociedad" | "Deportes" | "Tecnología";
  autor: string;
  fecha: string;
  urlOriginal: string;
  original: string;
  versiones: VersionMock[];
};

export const colaModeracion: NotaModeracion[] = [
  {
    id: "n1",
    titulo: "El banco central recorta la tasa de referencia",
    fuente: "La Nación",
    tema: "Economía",
    autor: "R. Méndez",
    fecha: "hace 8 min",
    urlOriginal: "https://example.com/nota-1",
    original:
      "El banco central redujo en cincuenta puntos básicos su tasa de interés de referencia, en una decisión que el mercado había anticipado durante las últimas semanas. La autoridad monetaria señaló que la inflación muestra signos de desaceleración y que la actividad económica se mantiene estable.",
    versiones: [
      {
        id: "n1v1",
        titulo: "La autoridad monetaria baja la tasa de referencia",
        contenido:
          "La autoridad monetaria recortó cincuenta puntos básicos la tasa de referencia, una medida que los inversores ya esperaban hacía semanas. El organismo destacó que la inflación da señales de enfriarse y que la actividad se mantiene firme.",
        similarity: 0.18,
        proveedor: "DeepSeek",
        tokensIn: 320,
        tokensOut: 180,
        costo: 0.0011,
      },
      {
        id: "n1v2",
        titulo: "Baja de tasas: el central acompaña al mercado",
        contenido:
          "En línea con lo que descontaban los operadores, el banco central dispuso una baja de cincuenta puntos básicos en su tasa de referencia. Según el comunicado, los precios empiezan a moderarse mientras la economía sostiene su nivel de actividad.",
        similarity: 0.27,
        proveedor: "Claude",
        tokensIn: 320,
        tokensOut: 205,
        costo: 0.0048,
      },
      {
        id: "n1v3",
        titulo: "El central reduce la tasa medio punto",
        contenido:
          "El banco central bajó medio punto la tasa de referencia, tal como anticipaba el mercado. La entidad remarcó que la inflación se desacelera y que la actividad económica permanece estable.",
        similarity: 0.34,
        proveedor: "DeepSeek",
        tokensIn: 320,
        tokensOut: 150,
        costo: 0.0009,
      },
    ],
  },
  {
    id: "n2",
    titulo: "Acuerdo paritario en el sector docente",
    fuente: "Página/12",
    tema: "Política",
    autor: "L. Ferreyra",
    fecha: "hace 22 min",
    urlOriginal: "https://example.com/nota-2",
    original:
      "El gobierno y los gremios docentes alcanzaron un acuerdo salarial que contempla un aumento escalonado durante el segundo semestre. Las clases comenzarán con normalidad la próxima semana tras varias jornadas de negociación.",
    versiones: [
      {
        id: "n2v1",
        titulo: "Docentes y gobierno cierran la paritaria",
        contenido:
          "Tras varias jornadas de diálogo, los gremios docentes y el gobierno firmaron un acuerdo salarial con subas escalonadas para la segunda mitad del año. El ciclo lectivo se reanudará con normalidad la semana próxima.",
        similarity: 0.21,
        proveedor: "DeepSeek",
        tokensIn: 280,
        tokensOut: 170,
        costo: 0.001,
      },
      {
        id: "n2v2",
        titulo: "Hay acuerdo salarial con los docentes",
        contenido:
          "El sector docente llegó a un entendimiento con las autoridades por un incremento salarial en cuotas durante el segundo semestre. Las clases continuarán sin interrupciones a partir de la próxima semana.",
        similarity: 0.3,
        proveedor: "Claude",
        tokensIn: 280,
        tokensOut: 188,
        costo: 0.0044,
      },
    ],
  },
  {
    id: "n3",
    titulo: "Nuevo récord de exportaciones en mayo",
    fuente: "Ámbito",
    tema: "Economía",
    autor: "C. Duarte",
    fecha: "hace 41 min",
    urlOriginal: "https://example.com/nota-3",
    original:
      "Las exportaciones alcanzaron un récord histórico en mayo, impulsadas por el complejo agroindustrial y la minería. El superávit comercial se amplió respecto del mismo mes del año anterior, según informó el organismo de estadísticas.",
    versiones: [
      {
        id: "n3v1",
        titulo: "Mayo marcó un récord exportador",
        contenido:
          "Impulsadas por el agro y la minería, las ventas al exterior tocaron un máximo histórico en mayo. El saldo comercial creció frente al mismo período del año pasado, de acuerdo con el organismo estadístico.",
        similarity: 0.24,
        proveedor: "DeepSeek",
        tokensIn: 300,
        tokensOut: 175,
        costo: 0.001,
      },
      {
        id: "n3v2",
        titulo: "Las exportaciones treparon a un máximo histórico",
        contenido:
          "El comercio exterior anotó un récord en mayo gracias al aporte del complejo agroindustrial y minero. El superávit se amplió en la comparación interanual, informaron las estadísticas oficiales.",
        similarity: 0.33,
        proveedor: "Claude",
        tokensIn: 300,
        tokensOut: 196,
        costo: 0.0047,
      },
    ],
  },
  {
    id: "n4",
    titulo: "Avanza la obra del nuevo hospital regional",
    fuente: "Infobae",
    tema: "Sociedad",
    autor: "M. Acosta",
    fecha: "hace 1 h",
    urlOriginal: "https://example.com/nota-4",
    original:
      "La construcción del nuevo hospital regional alcanzó el sesenta por ciento de avance y se prevé su inauguración para fin de año. El centro contará con áreas de diagnóstico, internación y guardia de alta complejidad.",
    versiones: [
      {
        id: "n4v1",
        titulo: "El hospital regional ya supera el 60% de avance",
        contenido:
          "Las obras del nuevo hospital regional superaron el sesenta por ciento y la apertura está prevista para fin de año. El edificio incluirá sectores de diagnóstico, internación y una guardia de alta complejidad.",
        similarity: 0.19,
        proveedor: "DeepSeek",
        tokensIn: 260,
        tokensOut: 165,
        costo: 0.0009,
      },
      {
        id: "n4v2",
        titulo: "Hospital regional: la obra llega al 60%",
        contenido:
          "Con un sesenta por ciento ejecutado, el nuevo hospital regional apunta a inaugurarse antes de que termine el año. Tendrá áreas de diagnóstico, internación y guardia de alta complejidad.",
        similarity: 0.41,
        proveedor: "Claude",
        tokensIn: 260,
        tokensOut: 180,
        costo: 0.0043,
      },
    ],
  },
  {
    id: "n5",
    titulo: "Una startup local lanza su asistente con IA",
    fuente: "Reuters",
    tema: "Tecnología",
    autor: "S. Ibáñez",
    fecha: "hace 2 h",
    urlOriginal: "https://example.com/nota-5",
    original:
      "Una startup tecnológica con sede en la región presentó un asistente basado en inteligencia artificial para pequeñas empresas. La herramienta automatiza tareas administrativas y promete reducir costos operativos.",
    versiones: [
      {
        id: "n5v1",
        titulo: "Llega un asistente con IA para pymes",
        contenido:
          "Una empresa tecnológica de la región lanzó un asistente con inteligencia artificial pensado para pequeños negocios. La solución automatiza tareas administrativas y apunta a bajar los costos de operación.",
        similarity: 0.26,
        proveedor: "DeepSeek",
        tokensIn: 240,
        tokensOut: 160,
        costo: 0.0008,
      },
    ],
  },
];
