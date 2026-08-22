// Miyagi Sánchez — 30-Day Organic Acquisition Board v0.1
// Final copy for X / Threads / Instagram. Source: miyagisanchez30dayorganicacquisitionboardv0.1.md
// Facts verified against apps/miyagisanchez/locales/{es,en}.json (live landing copy).
//
// evidence: "ready"  -> fully writable from the board + verified product facts. Schedules live.
// evidence: "needs"  -> object depends on real merchant/field material the board forbids faking.
//                       Goes to Buffer as a DRAFT with bracketed slots. Never auto-publishes.

export const objects = [
  // ─────────────────────────────── WEEK 1 — RECOGNITION ───────────────────────────────
  {
    id: 'O01', date: '2026-08-20', market: 'MX', territory: 'descubrir',
    title: 'Esto merece una tienda de verdad',
    tracking: 'mx_w1_discovery_merchant01',
    evidence: 'needs',
    needs: 'Un comercio real con permiso: foto del objeto, del puesto y de la tienda si ya existe. Sin esto no se publica.',
    x: `Lo primero que vimos en el puesto de [NOMBRE] fue [OBJETO + un detalle concreto].

[SEGUNDO DETALLE.]

Lo hace [NEGOCIO], en [LUGAR].

Negocios así son los que queremos que sean fáciles de encontrar.`,
    threads: `Lo primero que vimos en el puesto de [NOMBRE] fue [OBJETO + detalle concreto].

[SEGUNDO DETALLE.]

Llegamos ahí [CÓMO: por recomendación, caminando, buscando otra cosa]. Estuvimos [TIEMPO] preguntando cómo lo hace y por qué [DECISIÓN CONCRETA DEL COMERCIANTE].

Lo hace [NEGOCIO], en [LUGAR]. Vende por [CANAL] desde [AÑO].

Si quieres verlo: [LINK AL COMERCIO]`,
    ig: {
      caption: `Lo primero que vimos en el puesto de [NOMBRE] fue [OBJETO + detalle concreto].

[SEGUNDO DETALLE.]

Lo hace [NEGOCIO], en [LUGAR]. Vende por [CANAL] desde [AÑO].

Negocios así son los que queremos que sean fáciles de encontrar.

[LINK AL COMERCIO en la bio]

#ComercioIndependiente #HechoEnMéxico`,
      cards: [{
        theme: 'paper', eyebrow: 'Cosas que vale la pena descubrir',
        lead: 'Esto merece una tienda de verdad.',
        body: 'Sustituir por la foto real del comercio antes de publicar.',
        foot: '', size: 'lg',
      }],
      alt: 'Tarjeta tipográfica de Miyagi Sánchez, marcador temporal: debe sustituirse por la fotografía real del comercio.',
    },
  },
  {
    id: 'O02', date: '2026-08-21', market: 'MX', territory: 'comercio',
    title: 'Tu Instagram no es tu trastienda',
    tracking: 'mx_w1_pov_social_is_not_ops',
    evidence: 'ready',
    x: `Instagram sirve muy bien para que alguien note lo que haces.

Sirve muy mal para acordarse de quién ya pagó, de qué color lo quería, qué falta por enviar y si el precio de la historia de ayer sigue siendo el precio.`,
    threads: `Instagram sirve muy bien para que alguien note lo que haces.

Sirve muy mal para acordarse de quién ya pagó, de qué color lo quería, qué falta por enviar y si el precio de la historia de ayer sigue siendo el precio.

Si hoy vendes así, ¿qué parte se te hace pesada primero?`,
    ig: {
      caption: `Instagram sirve muy bien para que alguien note lo que haces.

Sirve muy mal para acordarse de quién ya pagó, de qué color lo quería, qué falta por enviar y si el precio de la historia de ayer sigue siendo el precio.

Si hoy vendes así, ¿qué parte se te hace pesada primero? Nos sirve leerlo.

#ComercioIndependiente #VenderEnLínea #Bazares`,
      cards: [{
        theme: 'ink', eyebrow: 'Comercio independiente',
        lead: 'Instagram sirve muy bien para que alguien note lo que haces.',
        body: 'Sirve muy mal para acordarse de quién ya pagó, de qué color lo quería, qué falta por enviar y si el precio de la historia de ayer sigue siendo el precio.',
        foot: '', size: 'lg',
      }],
      alt: 'Tarjeta tipográfica: Instagram sirve muy bien para que alguien note lo que haces; sirve muy mal para acordarse de quién ya pagó, de qué color lo quería, qué falta por enviar y si el precio de ayer sigue siendo el precio.',
    },
  },
  {
    id: 'O03', date: '2026-08-22', market: 'MX', territory: 'construir',
    title: 'Nota de campo #1',
    tracking: 'mx_w1_field_note_01',
    evidence: 'needs',
    needs: 'Conversaciones reales de bazar/comercio de esta semana. Si no hubo trabajo de campo, el board dice: no inventar el formato — publicar en su lugar una observación real de producto o comercio.',
    x: `Nota de campo #1 — [LUGAR], [DÍA].

[NÚMERO] conversaciones con comerciantes.

Lo que se repitió: [PROBLEMA CONCRETO, EN SUS PALABRAS].

Lo que no esperábamos: [SORPRESA].

Lo que vamos a cambiar por eso: [CAMBIO O PRUEBA CONCRETA].`,
    threads: `Nota de campo #1 — [LUGAR], [DÍA].

Fuimos a [LUGAR] y hablamos con [NÚMERO] comerciantes. No a venderles nada: a preguntarles cómo venden hoy.

Lo que se repitió: [PROBLEMA CONCRETO, EN SUS PALABRAS].

Lo que no esperábamos: [SORPRESA].

Lo que vamos a cambiar por eso: [CAMBIO O PRUEBA CONCRETA].

Seguimos yendo. Si tienes un puesto o conoces uno al que deberíamos ir, dinos.`,
    ig: {
      caption: `Nota de campo #1 — [LUGAR], [DÍA].

[NÚMERO] conversaciones con comerciantes.

Lo que se repitió: [PROBLEMA CONCRETO, EN SUS PALABRAS].
Lo que no esperábamos: [SORPRESA].
Lo que vamos a cambiar por eso: [CAMBIO CONCRETO].

Seguimos yendo. Si conoces un puesto al que deberíamos ir, dinos.

#Bazares #ComercioLocal #HechoEnMéxico`,
      cards: [{
        theme: 'paper', eyebrow: 'Construyendo el mercado',
        lead: 'Nota de campo #1',
        body: '[LUGAR] · [NÚMERO] conversaciones · un problema que se repitió · una sorpresa · un cambio.',
        foot: '', size: 'xl',
      }],
      alt: 'Tarjeta tipográfica: Nota de campo número uno, con lugar, número de conversaciones, problema repetido, sorpresa y cambio.',
    },
  },
  {
    id: 'O04', date: '2026-08-24', market: 'US', territory: 'comercio',
    title: 'A marketplace can be a channel',
    tracking: 'us_w1_pov_marketplace_channel',
    evidence: 'ready',
    x: `A marketplace can be a channel. It doesn't have to become your business.

An independent merchant should be able to take discovery where discovery helps, and keep the shop, the customer relationship and the name on it.`,
    threads: `A marketplace can be a channel. It doesn't have to become your business.

The trade most independent merchants have already made once: you get found, and in exchange the buyer belongs to the platform. You don't get the email. You don't set the terms. You rank, or you don't.

Take the discovery. Keep the shop, the customer relationship and the name on it.

If you sell in both places today — where does that trade actually cost you?`,
    ig: null,
  },
  {
    id: 'O05', date: '2026-08-25', market: 'MX', territory: 'escuela',
    title: 'Antes de abrir otro canal de venta',
    tracking: 'both_w1_school_channel_cost',
    evidence: 'ready',
    x: `Antes de abrir otro canal de venta, contesta cuatro cosas: quién manda en el precio, quién manda en el inventario, quién le avisa al cliente en qué va su pedido, y por dónde te escribe.

Si las cuatro se vuelven trabajo manual nuevo, ese canal ya cuesta antes de cobrar comisión.`,
    threads: `Antes de abrir otro canal de venta, contesta cuatro cosas:

Quién manda en el precio.
Quién manda en el inventario.
Quién le avisa al cliente en qué va su pedido.
Por dónde te escribe.

Si las cuatro se vuelven trabajo manual nuevo, ese canal ya te está costando antes de cobrarte comisión. Y el costo no aparece en ninguna página de precios: aparece el domingo, cuando estás actualizando el mismo dato en tres lados.

Guárdalo para la próxima vez que alguien te diga que abras otro.`,
    ig: {
      caption: `Antes de abrir otro canal de venta, contesta cuatro cosas.

Si las cuatro se vuelven trabajo manual nuevo, ese canal ya te está costando antes de cobrarte comisión — y ese costo no aparece en ninguna página de precios. Aparece el domingo, actualizando el mismo dato en tres lados.

Guárdalo para la próxima vez que te digan que abras otro.

#ComercioIndependiente #VenderEnLínea #Emprendimiento`,
      cards: [
        { theme: 'sand', eyebrow: 'Escuela de comerciantes', lead: 'Antes de abrir otro canal de venta, contesta cuatro cosas.', body: '', foot: '01 / 06', size: 'lg' },
        { theme: 'sand', eyebrow: '01', lead: '¿Quién manda en el precio?', body: 'Si el precio vive en tres lugares, tarde o temprano vas a vender al equivocado.', foot: '02 / 06', size: 'lg' },
        { theme: 'sand', eyebrow: '02', lead: '¿Quién manda en el inventario?', body: 'Vender lo que ya no tienes cuesta más caro que no venderlo.', foot: '03 / 06', size: 'lg' },
        { theme: 'sand', eyebrow: '03', lead: '¿Quién le avisa al cliente en qué va su pedido?', body: 'Si la respuesta eres tú, a mano, cada vez, eso es un trabajo nuevo.', foot: '04 / 06', size: 'md' },
        { theme: 'sand', eyebrow: '04', lead: '¿Por dónde te escribe?', body: 'Una bandeja más que revisar no es gratis solo porque la app lo sea.', foot: '05 / 06', size: 'lg' },
        { theme: 'ink', eyebrow: 'La regla', lead: 'Si las cuatro se vuelven trabajo manual nuevo, el canal ya te está costando antes de cobrarte comisión.', body: '', foot: '06 / 06', size: 'md' },
      ],
      alt: 'Carrusel de seis tarjetas: cuatro preguntas que hacerse antes de abrir otro canal de venta — precio, inventario, aviso al cliente y canal de contacto — y la regla final sobre su costo operativo.',
    },
  },

  // ─────────────────────────────── WEEK 2 — OPERATIONAL PAIN ───────────────────────────
  {
    id: 'O06', date: '2026-08-27', market: 'MX', territory: 'comercio',
    title: 'Lo caro no siempre es la comisión',
    tracking: 'mx_w2_pov_hidden_operating_cost',
    evidence: 'ready',
    x: `Cuando abres un canal nuevo, la comisión es lo que viene en la portada.

Lo caro está abajo: otro catálogo que mantener, otras fotos que subir, otra bandeja que contestar, y una versión más de tu precio que se puede quedar vieja sin que te enteres.`,
    threads: `Cuando abres un canal nuevo, la comisión es lo que viene en la portada.

Lo caro suele estar abajo: otro catálogo que mantener, otras fotos que subir, otra promoción que armar, otra bandeja que contestar, y una versión más de tu precio que se puede quedar vieja sin que te enteres.

Eso no se paga con dinero, se paga con domingos.

¿Cuál de esos cinco te da más lata hoy?`,
    ig: {
      caption: `Cuando abres un canal nuevo, la comisión es lo que viene en la portada.

Lo caro suele estar abajo: otro catálogo que mantener, otras fotos que subir, otra promoción que armar, otra bandeja que contestar, y una versión más de tu precio que se puede quedar vieja sin que te enteres.

Eso no se paga con dinero. Se paga con domingos.

#ComercioIndependiente #VenderEnLínea #Ecommerce`,
      cards: [{
        theme: 'ink', eyebrow: 'Comercio independiente',
        lead: 'Lo caro de un canal nuevo no siempre es la comisión.',
        body: 'Otro catálogo que mantener. Otras fotos que subir. Otra promoción que armar. Otra bandeja que contestar. Y una versión más de tu precio que se puede quedar vieja sin que te enteres.',
        foot: '', size: 'lg',
      }],
      alt: 'Tarjeta tipográfica: lo caro de un canal nuevo no siempre es la comisión, sino mantener otro catálogo, otras fotos, otra promoción, otra bandeja y otra versión del precio.',
    },
  },
  {
    id: 'O07', date: '2026-08-28', market: 'US', territory: 'escuela',
    title: "Don't migrate on a promise",
    tracking: 'us_w2_school_parallel_proof',
    evidence: 'ready',
    x: `If your store pays the bills, don't replace it because a landing page says migration is easy.

Run the new one beside it. Push real orders through payment, inventory, shipping, URLs, analytics. Then decide.

That's how we're taking on founding merchants: miyagisanchez.com/us/sell`,
    threads: `If your store pays the bills, don't replace it because a landing page says migration is easy. Run the new one beside it, push real orders through payment, inventory, shipping, URLs and analytics, then decide.

Switching costs are real and mostly invisible on the way in: the redirects you forget, the SKU that doesn't map, the subscription that quietly stops charging. None of it shows up in a migration guide.

That's how we're taking on founding merchants: miyagisanchez.com/us/sell`,
    ig: null,
  },
  {
    id: 'O08', date: '2026-08-29', market: 'MX', territory: 'descubrir',
    title: 'Cinco cosas que vimos esta semana',
    tracking: 'mx_w2_discovery_five_noticed',
    evidence: 'needs',
    needs: 'Cinco productos reales de comercios con permiso o públicamente enlazables. Una frase por objeto sobre por qué se notó. Sin ranking.',
    x: `Cinco cosas que vimos esta semana. No es un top: es lo que nos hizo detenernos.

1. [OBJETO] de [NEGOCIO] — [por qué].
2. [OBJETO] de [NEGOCIO] — [por qué].
3. [OBJETO] de [NEGOCIO] — [por qué].
4. [OBJETO] de [NEGOCIO] — [por qué].
5. [OBJETO] de [NEGOCIO] — [por qué].`,
    threads: `Cinco cosas que vimos esta semana. No es un top, no están ordenadas: es lo que nos hizo detenernos.

1. [OBJETO] de [NEGOCIO] — [por qué].
2. [OBJETO] de [NEGOCIO] — [por qué].
3. [OBJETO] de [NEGOCIO] — [por qué].
4. [OBJETO] de [NEGOCIO] — [por qué].
5. [OBJETO] de [NEGOCIO] — [por qué].

Los enlaces van en los comentarios.`,
    ig: {
      caption: `Cinco cosas que vimos esta semana. No es un top y no están ordenadas: es lo que nos hizo detenernos.

1. [OBJETO] de [NEGOCIO] — [por qué].
2. [OBJETO] de [NEGOCIO] — [por qué].
3. [OBJETO] de [NEGOCIO] — [por qué].
4. [OBJETO] de [NEGOCIO] — [por qué].
5. [OBJETO] de [NEGOCIO] — [por qué].

#ComercioIndependiente #HechoEnMéxico #Bazares`,
      cards: [{
        theme: 'paper', eyebrow: 'Cosas que vale la pena descubrir',
        lead: 'Cinco cosas que vimos esta semana.',
        body: 'Sustituir por las cinco fotos reales de producto antes de publicar.',
        foot: '', size: 'xl',
      }],
      alt: 'Tarjeta tipográfica, marcador temporal: debe sustituirse por cinco fotografías reales de producto.',
    },
  },
  {
    id: 'O09', date: '2026-08-31', market: 'MX', territory: 'construir',
    title: 'Creíamos que lo difícil era abrir la tienda',
    tracking: 'mx_w2_build_actual_friction',
    evidence: 'needs',
    needs: 'Una observación real de activación: qué fricción esperábamos vs. cuál reportan los comercios, y qué cambió o se está probando el equipo.',
    x: `Creíamos que lo difícil era abrir la tienda.

Abrirla toma [TIEMPO REAL]. Lo que pesa viene después: [CARGA RECURRENTE REAL QUE REPORTAN LOS COMERCIOS].

Por eso estamos [CAMBIO O PRUEBA CONCRETA DEL EQUIPO].`,
    threads: `Creíamos que lo difícil era abrir la tienda.

Abrirla toma [TIEMPO REAL]. Lo que pesa viene después: [CARGA RECURRENTE REAL].

[DETALLE: qué nos hizo verlo — cuántos comercios, en qué momento, qué dijeron.]

Por eso estamos [CAMBIO O PRUEBA CONCRETA]. Si sales de esa prueba con una opinión, la queremos.`,
    ig: {
      caption: `Creíamos que lo difícil era abrir la tienda.

Abrirla toma [TIEMPO REAL]. Lo que pesa viene después: [CARGA RECURRENTE REAL].

Por eso estamos [CAMBIO O PRUEBA CONCRETA].

#ConstruyendoEnPúblico #ComercioIndependiente`,
      cards: [{
        theme: 'paper', eyebrow: 'Construyendo el mercado',
        lead: 'Creíamos que lo difícil era abrir la tienda.',
        body: 'Lo difícil viene después. [Completar con la observación real de activación.]',
        foot: '', size: 'lg',
      }],
      alt: 'Tarjeta tipográfica: creíamos que lo difícil era abrir la tienda; lo difícil viene después.',
    },
  },
  {
    id: 'O10', date: '2026-09-01', market: 'MX', territory: 'unete',
    title: 'Te preparamos la tienda',
    tracking: 'mx_w2_acq_prepared_shop',
    evidence: 'ready',
    x: `Si ya vendes en bazares, Instagram, WhatsApp o marketplaces, no necesitas otra cuenta vacía que configurar.

Queremos ayudarte a dejar lista una tienda que sí puedas usar: tus productos, tu identidad y una forma más seria de vender directo.

miyagisanchez.com/mx/vende`,
    threads: `Si ya vendes en bazares, Instagram, WhatsApp o marketplaces, no necesitas otra cuenta vacía que configurar.

Casi nunca el problema es que falte una plataforma. Es que abrir la tienda te deja frente a una pantalla en blanco: sube tus fotos, escribe tus descripciones, arma tus categorías, tú solo, un domingo.

Queremos ayudarte a dejar lista una tienda que sí puedas usar: tus productos, tu identidad y una forma más seria de vender directo.

miyagisanchez.com/mx/vende`,
    ig: {
      caption: `Si ya vendes en bazares, Instagram, WhatsApp o marketplaces, no necesitas otra cuenta vacía que configurar.

Queremos ayudarte a dejar lista una tienda que sí puedas usar: tus productos, tu identidad y una forma más seria de vender directo.

Comisión de plataforma: 0%. El dinero llega directo a tu cuenta.

miyagisanchez.com/mx/vende (link en la bio)

#ComercioIndependiente #HechoEnMéxico #VenderEnLínea`,
      cards: [{
        theme: 'selva', eyebrow: 'Únete al mercado',
        lead: 'No necesitas otra cuenta vacía que configurar.',
        body: 'Si ya vendes en bazares, Instagram, WhatsApp o marketplaces, queremos ayudarte a dejar lista una tienda que sí puedas usar.',
        foot: 'miyagisanchez.com/mx/vende', size: 'lg',
      }],
      alt: 'Tarjeta verde de Miyagi Sánchez: no necesitas otra cuenta vacía que configurar; te ayudamos a dejar lista una tienda que sí puedas usar. miyagisanchez.com/mx/vende',
    },
  },

  // ─────────────────────────────── WEEK 3 — INDEPENDENCE ───────────────────────────────
  {
    id: 'O11', date: '2026-09-03', market: 'US', territory: 'comercio',
    title: 'Own your shop. Share the marketplace.',
    tracking: 'us_w3_pov_own_and_share',
    evidence: 'ready',
    x: `The choice independent merchants keep getting handed: marketplace discovery, or a shop with your own name on it.

It was never a real choice. It's just how the software was built.

Own your shop. Share the marketplace.`,
    threads: `The choice independent merchants keep getting handed: marketplace discovery, or a shop with your own name on it.

It was never a real choice. It's an artifact of how the software got built: the place that sends you buyers wants to keep them, and the place that gives you a storefront sends none.

We're building for both. Your shop stays yours: your domain, your customers, 0% platform commission. The marketplace is a channel you share, not a landlord you move in with.

miyagisanchez.com/us/sell`,
    ig: null,
  },
  {
    id: 'O12', date: '2026-09-04', market: 'MX', territory: 'escuela',
    title: '¿Tu tienda está lista para que alguien confíe en ella?',
    tracking: 'mx_w3_school_trust_checks',
    evidence: 'ready',
    x: `Cuatro cosas que revisa alguien antes de comprarle a una tienda que no conoce:

El precio se ve sin preguntar. Las fotos muestran el producto, no el mood. Dice cuándo llega y cómo. Hay forma real de escribirle a una persona.

Ninguna es de diseño. Las cuatro son de confianza.`,
    threads: `Cuatro cosas que revisa alguien antes de comprarle a una tienda que no conoce:

El precio se ve sin preguntar.
Las fotos muestran el producto, no el mood.
Dice cuándo llega y cómo.
Hay una forma real de escribirle a una persona.

Ninguna es de diseño. Las cuatro son de confianza, y las cuatro se arreglan en una tarde.

Si tu tienda ya cumple las cuatro, estás mejor que la mayoría de las que vemos.`,
    ig: {
      caption: `Cuatro cosas que revisa alguien antes de comprarle a una tienda que no conoce.

Ninguna es de diseño. Las cuatro son de confianza, y las cuatro se arreglan en una tarde.

Si tu tienda ya cumple las cuatro, estás mejor que la mayoría de las que vemos.

#ComercioIndependiente #VenderEnLínea #Emprendimiento`,
      cards: [
        { theme: 'sand', eyebrow: 'Escuela de comerciantes', lead: '¿Tu tienda está lista para que alguien confíe en ella?', body: 'Cuatro cosas que revisa quien no te conoce.', foot: '01 / 06', size: 'md' },
        { theme: 'sand', eyebrow: '01', lead: 'El precio se ve sin preguntar.', body: '“Mándame DM para precio” le cuesta a quien está decidiendo, no a quien vende.', foot: '02 / 06', size: 'lg' },
        { theme: 'sand', eyebrow: '02', lead: 'Las fotos muestran el producto, no el mood.', body: 'Una foto que no deja ver el tamaño, el color real o el acabado no está vendiendo.', foot: '03 / 06', size: 'md' },
        { theme: 'sand', eyebrow: '03', lead: 'Dice cuándo llega y cómo.', body: 'Un plazo realista genera más confianza que un plazo corto que no se cumple.', foot: '04 / 06', size: 'lg' },
        { theme: 'sand', eyebrow: '04', lead: 'Hay una forma real de escribirle a una persona.', body: 'Que se note que del otro lado hay alguien que responde.', foot: '05 / 06', size: 'md' },
        { theme: 'ink', eyebrow: 'Las cuatro', lead: 'Ninguna es de diseño. Las cuatro son de confianza.', body: 'Y las cuatro se arreglan en una tarde.', foot: '06 / 06', size: 'lg' },
      ],
      alt: 'Carrusel de seis tarjetas con las cuatro revisiones de confianza de una tienda: precio visible, fotos que muestran el producto, plazo y forma de entrega, y un contacto real.',
    },
  },
  {
    id: 'O13', date: '2026-09-05', market: 'MX', territory: 'construir',
    title: 'Por qué a veces vamos a decir “todavía no”',
    tracking: 'mx_w3_build_curation_standard',
    evidence: 'ready',
    x: `A veces le vamos a decir a un negocio “todavía no”.

No es por estética. Quien vende independiente merece que lo presenten en serio, y quien compra merece una tienda que diga la verdad sobre precio, foto y entrega.

Cuando falta eso, preferimos ayudar a completarla antes.`,
    threads: `A veces le vamos a decir a un negocio “todavía no”.

No es por estética, y no es un filtro de buen gusto. Quien vende independiente merece que lo presenten en serio, y quien compra merece una tienda que diga la verdad sobre precio, foto y entrega.

Cuando falta algo de eso, la respuesta no es rechazar al comercio. Es ayudarlo a completarlo antes de publicar, y publicar cuando esté.

Un catálogo lleno de tiendas a medias no le sirve a nadie: ni al que vende, ni al que compra, ni a nosotros.`,
    ig: {
      caption: `A veces le vamos a decir a un negocio “todavía no”.

No es por estética, y no es un filtro de buen gusto. Quien vende independiente merece que lo presenten en serio, y quien compra merece una tienda que diga la verdad sobre precio, foto y entrega.

Cuando falta algo de eso, la respuesta no es rechazar al comercio. Es ayudarlo a completarlo antes de publicar.

#ComercioIndependiente #ConstruyendoEnPúblico`,
      cards: [{
        theme: 'paper', eyebrow: 'Construyendo el mercado',
        lead: 'A veces vamos a decir “todavía no”.',
        body: 'No por estética. Porque quien vende merece que lo presenten en serio, y quien compra merece una tienda que diga la verdad sobre precio, foto y entrega.',
        foot: '', size: 'lg',
      }],
      alt: 'Tarjeta tipográfica: a veces vamos a decir todavía no; no por estética, sino porque quien vende merece que lo presenten en serio y quien compra merece una tienda que diga la verdad.',
    },
  },
  {
    id: 'O14', date: '2026-09-07', market: 'MX', territory: 'promotor',
    title: 'Tú ya conoces a los comerciantes',
    tracking: 'mx_w3_promoter_proximity',
    evidence: 'ready',
    x: `Si te mueves entre bazares, diseño, foto o comercio local, ya conoces a los negocios que nos faltan.

El trabajo de promotor es concreto: encuentras un buen negocio, lo acompañas hasta que su tienda queda lista, y ganas cuando esa relación produce venta.

miyagisanchez.com/mx/vende/promotor`,
    threads: `Si te mueves entre bazares, diseño, foto, marketing o comercio local, ya conoces a los negocios que nos faltan. Esa es la parte difícil, y tú ya la tienes.

El trabajo es concreto: entras al negocio, sales con su tienda en línea, y ganas cuando esa relación produce venta. La tienda es gratis y se queda gratis; lo que se cobra son los extras que un negocio en serio sí quiere.

No es referir un link. Es acompañar a un comercio hasta que su catálogo está listo.

miyagisanchez.com/mx/vende/promotor`,
    ig: {
      caption: `Si te mueves entre bazares, diseño, foto, marketing o comercio local, ya conoces a los negocios que nos faltan. Esa es la parte difícil, y tú ya la tienes.

El trabajo es concreto: entras al negocio, sales con su tienda en línea, y ganas cuando esa relación produce venta.

No es referir un link. Es acompañar a un comercio hasta que su catálogo está listo.

miyagisanchez.com/mx/vende/promotor (link en la bio)

#ComercioLocal #Bazares #TrabajoIndependiente`,
      cards: [{
        theme: 'sand', eyebrow: 'Promotores',
        lead: 'Tú ya conoces a los comerciantes.',
        body: 'Entras al negocio, sales con su tienda en línea, y ganas cuando esa relación produce venta.',
        foot: 'miyagisanchez.com/mx/vende/promotor', size: 'lg',
      }],
      alt: 'Tarjeta tipográfica: tú ya conoces a los comerciantes. Entras al negocio, sales con su tienda en línea, y ganas cuando esa relación produce venta.',
    },
  },
  {
    id: 'O15', date: '2026-09-08', market: 'US', territory: 'descubrir',
    title: 'Built for things worth discovering',
    tracking: 'us_w3_discovery_worth_finding',
    evidence: 'needs',
    needs: 'Comercio/producto real de EE. UU. con permiso o crédito público claro.',
    x: `[OBJECT + one concrete detail that made it worth stopping for.]

[SECOND DETAIL.]

Made by [MERCHANT], in [PLACE].

A marketplace is only useful when there's judgment behind what it shows you. That's the part we're building.`,
    threads: `[OBJECT + one concrete detail.]

[SECOND DETAIL — something you only notice up close or by asking.]

Made by [MERCHANT], in [PLACE]. [HOW WE FOUND IT.]

A marketplace is only useful when there's judgment behind what it shows you. Volume is easy. Volume is what everyone already has.

[LINK TO MERCHANT]`,
    ig: null,
  },

  // ─────────────────────────────── WEEK 4 — INVITATION ────────────────────────────────
  {
    id: 'O16', date: '2026-09-10', market: 'MX', territory: 'descubrir',
    title: 'Del bazar a la tienda',
    tracking: 'mx_w4_proof_bazaar_to_shop',
    evidence: 'needs',
    needs: 'Un comercio real con las tres piezas: foto del puesto, foto del producto, y su tienda Miyagi Sánchez terminada. El comercio es el protagonista, no nosotros.',
    x: `[NEGOCIO] ya tenía [LO QUE YA EXISTÍA: producto, puesto, clientes, años].

Lo que le ayudamos a preparar: [QUÉ HICIMOS, CONCRETO].

Lo que puede hacer ahora: [QUÉ CAMBIÓ, CONCRETO].

Su tienda: [LINK]`,
    threads: `[NEGOCIO] ya tenía lo difícil: [PRODUCTO], [AÑOS] vendiendo en [LUGAR], y clientes que regresan.

Lo que no tenía era una forma de que alguien que no pasa por ahí le comprara.

Lo que le ayudamos a preparar: [QUÉ HICIMOS].
Lo que puede hacer ahora: [QUÉ CAMBIÓ].

Su tienda: [LINK]

¿Vendes algo así? miyagisanchez.com/mx/vende`,
    ig: {
      caption: `[NEGOCIO] ya tenía lo difícil: [PRODUCTO], [AÑOS] vendiendo en [LUGAR], y clientes que regresan.

Lo que le ayudamos a preparar: [QUÉ HICIMOS].
Lo que puede hacer ahora: [QUÉ CAMBIÓ].

¿Vendes algo así? miyagisanchez.com/mx/vende (link en la bio)

#ComercioIndependiente #HechoEnMéxico #Bazares`,
      cards: [{
        theme: 'paper', eyebrow: 'Cosas que vale la pena descubrir',
        lead: 'Del bazar a la tienda.',
        body: 'Sustituir por: foto del puesto, foto del producto y la tienda terminada del comercio.',
        foot: '', size: 'xl',
      }],
      alt: 'Tarjeta tipográfica, marcador temporal: debe sustituirse por las fotografías reales del puesto, el producto y la tienda terminada.',
    },
  },
  {
    id: 'O17', date: '2026-09-11', market: 'US', territory: 'construir',
    title: "What we won't promise US merchants",
    tracking: 'us_w4_build_no_fake_demand',
    evidence: 'ready',
    x: `We won't tell you thousands of US buyers are waiting on Miyagi Sánchez. There aren't, yet.

What a founding merchant gets today: a shop you own, 0% platform commission, USD settled into your own Stripe account, and a low-risk way to test the rest.

miyagisanchez.com/us/sell`,
    threads: `We won't tell you there are thousands of US buyers waiting on Miyagi Sánchez. There aren't, yet. A marketplace that says otherwise on day one is describing a roadmap, not a market.

What a founding merchant gets today: a shop you own, 0% platform commission, card payments in USD settled into your own Stripe account rather than a platform balance, delivery you control, and a catalog Claude, Gemini and ChatGPT can read.

The demand side is the part being built.

miyagisanchez.com/us/sell`,
    ig: null,
  },
  {
    id: 'O18', date: '2026-09-12', market: 'MX', territory: 'unete',
    title: 'Tiendas Fundadoras',
    tracking: 'mx_w4_acq_founding_collection',
    evidence: 'ready',
    note: 'CTA corregido a /mx/vende/fundadoras (la página real de la cohorte). Cifras verificadas en locales/es.json: 25 lugares, acompañamiento 1 a 1, vista previa privada.',
    x: `No queremos llenar un catálogo por llenarlo. Estamos armando la primera colección con negocios independientes que valga la pena descubrir.

Son 25 lugares, con acompañamiento para dejar tu catálogo listo. Nadie se publica sin tu visto bueno.

miyagisanchez.com/mx/vende/fundadoras`,
    threads: `No queremos llenar un catálogo por llenarlo. Estamos armando la primera colección con negocios independientes que valga la pena descubrir.

Son 25 lugares. Aplicas con los datos básicos de tu negocio, alguien del equipo te acompaña a dejar tu catálogo listo, y revisas una vista previa privada antes de que tu tienda exista para el público.

Si ya vendes algo tuyo en bazares, Instagram o WhatsApp y te falta la tienda, esto es para ti.

miyagisanchez.com/mx/vende/fundadoras`,
    ig: {
      caption: `No queremos llenar un catálogo por llenarlo. Estamos armando la primera colección con negocios independientes que valga la pena descubrir.

Son 25 lugares. A cada uno lo acompañamos a dejar su catálogo listo, y nadie se publica hasta que el negocio ve su tienda en privado y dice que sí.

Si ya vendes algo tuyo en bazares, Instagram, WhatsApp o marketplaces y te falta la tienda, esto es para ti.

miyagisanchez.com/mx/vende/fundadoras (link en la bio)

#ComercioIndependiente #HechoEnMéxico #Bazares`,
      cards: [{
        theme: 'selva', eyebrow: 'Tiendas fundadoras · 25 lugares',
        lead: 'No queremos llenar un catálogo por llenarlo.',
        body: 'Estamos armando la primera colección con negocios independientes que valga la pena descubrir. A cada uno lo acompañamos a dejar su catálogo listo.',
        foot: 'miyagisanchez.com/mx/vende/fundadoras', size: 'lg',
      }],
      alt: 'Tarjeta verde de Miyagi Sánchez: Tiendas Fundadoras, 25 lugares. No queremos llenar un catálogo por llenarlo.',
      swap: 'El board pide una cuadrícula de comercios/productos reales participantes. Sustituir la tarjeta por ese collage en cuanto haya fundadoras confirmadas.',
    },
  },
  {
    id: 'O19', date: '2026-09-14', market: 'US', territory: 'unete',
    title: 'Expansion first. Migration only if earned.',
    tracking: 'us_w4_acq_expansion_first',
    evidence: 'ready',
    x: `Keep the store you have. Open a Miyagi Sánchez shop next to it. Run real orders through both for a few weeks — checkout, inventory, delivery, the reports you actually read.

If it earns the move, move. If it doesn't, you're out a setup afternoon.

miyagisanchez.com/us/sell`,
    threads: `Keep the store you have. Open a Miyagi Sánchez shop next to it. Run real orders through both for a few weeks — checkout, inventory, delivery, the reports you actually read.

If it earns the move, move. If it doesn't, you're out a setup afternoon and nothing else.

We're asking merchants to expand before they migrate because we think that's the honest order of operations, and because a founding merchant who moved on a promise is a merchant who leaves in month four.

miyagisanchez.com/us/sell`,
    ig: null,
  },
  {
    id: 'O20', date: '2026-09-15', market: 'MX', territory: 'construir',
    title: 'Lo que nos enseñó el mes uno',
    tracking: 'both_w4_build_month01_learning',
    evidence: 'needs',
    needs: 'De 3 a 5 observaciones REALES del mes: conversaciones sostenidas, el problema que más se repitió, el mensaje que trajo interés calificado, algo que no funcionó, y una cosa que cambia. Sin narrativa de victoria.',
    x: `Primer mes. Lo que aprendimos:

1. [OBSERVACIÓN REAL].
2. [PROBLEMA QUE MÁS SE REPITIÓ].
3. [EL MENSAJE QUE TRAJO INTERÉS CALIFICADO].
4. [LO QUE NO FUNCIONÓ].
5. Lo que cambia el mes que entra: [CAMBIO].`,
    threads: `Primer mes. Lo que aprendimos, sin adornos:

1. [OBSERVACIÓN REAL: cuántas conversaciones, con quién.]
2. [EL PROBLEMA QUE MÁS SE REPITIÓ, en palabras de los comercios.]
3. [EL MENSAJE QUE TRAJO INTERÉS CALIFICADO — y por qué creemos que fue ese.]
4. [LO QUE NO FUNCIONÓ. Sin suavizar.]
5. Lo que cambia el mes que entra: [CAMBIO CONCRETO].

Si algo de esto te suena de tu propio negocio, dinos cuál.`,
    ig: {
      caption: `Primer mes. Lo que aprendimos, sin adornos.

1. [OBSERVACIÓN REAL].
2. [EL PROBLEMA QUE MÁS SE REPITIÓ].
3. [EL MENSAJE QUE TRAJO INTERÉS CALIFICADO].
4. [LO QUE NO FUNCIONÓ].
5. Lo que cambia el mes que entra: [CAMBIO].

Si algo de esto te suena de tu propio negocio, dinos cuál.

#ConstruyendoEnPúblico #ComercioIndependiente`,
      cards: [
        { theme: 'paper', eyebrow: 'Construyendo el mercado', lead: 'Lo que nos enseñó el mes uno.', body: 'Cinco cosas, sin adornos.', foot: '01 / 06', size: 'xl' },
        { theme: 'paper', eyebrow: '01 · Lo que vimos', lead: '[OBSERVACIÓN REAL]', body: '', foot: '02 / 06', size: 'lg' },
        { theme: 'paper', eyebrow: '02 · Lo que se repitió', lead: '[EL PROBLEMA MÁS COMÚN]', body: '', foot: '03 / 06', size: 'lg' },
        { theme: 'paper', eyebrow: '03 · Lo que sí trajo gente', lead: '[EL MENSAJE QUE FUNCIONÓ]', body: '', foot: '04 / 06', size: 'lg' },
        { theme: 'paper', eyebrow: '04 · Lo que no funcionó', lead: '[SIN SUAVIZAR]', body: '', foot: '05 / 06', size: 'lg' },
        { theme: 'ink', eyebrow: '05 · Lo que cambia', lead: '[CAMBIO CONCRETO PARA EL MES DOS]', body: '', foot: '06 / 06', size: 'lg' },
      ],
      alt: 'Carrusel de seis tarjetas con las cinco lecciones del primer mes de Miyagi Sánchez.',
    },
  },
]

// Posting times, America/Mexico_City. Weekends move later; Instagram sits in the evening.
export const times = {
  twitter:   { weekday: '10:00', sat: '11:30' },
  threads:   { weekday: '13:30', sat: '12:30' },
  instagram: { weekday: '19:00', sat: '12:00' },
}
