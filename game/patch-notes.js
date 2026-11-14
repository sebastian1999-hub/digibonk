// Generated from RELEASE-NOTES.md by scripts/sync-patch-notes.cjs.
window.DigibonkPatchNotes = {
  "currentVersion": "1.38.0",
  "pending": [],
  "releases": [
    {
      "version": "1.38.0",
      "title": "Pasivas de huevo y novedades de combate",
      "changes": [
        "Doce pasivas propias de cada huevo, persistentes al evolucionar, con nuevos iconos y cartas de rareza.",
        "El exceso de probabilidad crítica aumenta el daño crítico. Choromon renueva tarjetas, Mokumon compra técnicas de otras líneas y YukimiBotamon detiene una ruleta de cofres.",
        "Mejor rendimiento de navegación para las hordas de Yuramon y ajustes del menú de incubación.",
        "Info parche sustituye el botón Liga y muestra las novedades y correcciones de cada versión.",
        "La habilidad activa Q tiene una recarga mínima de 2,5 segundos.",
        "Los enemigos se vuelven incontrolables tras acumular 5 segundos de stun o ralentización; un escudo naranja identifica su inmunidad durante 5 segundos. Después el contador se reinicia y pueden volver a recibir controles.",
        "Gacha exclusivo de Zurumon: un intento por cofre, con éxito del 20 % al 50 % según el nivel.",
        "Reliquias y mejoras de cantidad acumulables, incluidos los objetos legendarios.",
        "Rebote digital: mejora desde rara, con 1/2/3 rebotes según rareza, acumulables. Cada salto busca otro enemigo cercano y conserva el 80 % del daño.",
        "Mapa y minimapa en rombo con el marco aportado y coordenadas adaptadas.",
        "Recolectores con sprites nuevos: básicos más lentos, fusión de cada tres mejoras en un recolector evolucionado más rápido."
      ]
    },
    {
      "version": "1.37.6",
      "title": "Teclas tras menús y portales",
      "changes": [
        "El movimiento mantenido se recupera al cerrar menús o terminar transiciones, incluso con varias teclas pulsadas. Soltar una tecla durante la transición se registra correctamente.",
        "Perder el foco limpia las teclas para evitar movimiento atascado. Las acciones puntuales no se repiten al recuperar el movimiento."
      ]
    },
    {
      "version": "1.37.4",
      "title": "Fondo del menú de huevos",
      "changes": [
        "Sustituido el fondo del menú de huevos por la imagen corregida con transparencia proporcionada. Incluye el marco naranja y el brillo de las mejoras legendarias de 1.37.3."
      ]
    },
    {
      "version": "1.37.3",
      "title": "Marco legendario",
      "changes": [
        "Nuevo marco naranja para mejoras legendarias, con halo dorado y reflejo suave para reconocerlas rápidamente.",
        "El reflejo animado respeta la preferencia de movimiento reducido."
      ]
    },
    {
      "version": "1.37.2",
      "title": "Elegir técnica al evolucionar",
      "changes": [
        "Con cuatro técnicas equipadas, una nueva técnica de evolución permite elegir cuál sustituir o conservar las cuatro actuales. La elección aparece al terminar la animación y se conserva al guardar."
      ]
    },
    {
      "version": "1.37.1",
      "title": "Cofres gratuitos y botín de portales",
      "changes": [
        "Los cofres que dejan los enemigos cuestan 0 bits y no encarecen los cofres de pago.",
        "Los cofres abiertos dentro de portales tienen una probabilidad ligeramente mayor de objetos raros, épicos y legendarios. Las probabilidades mostradas reflejan la bonificación."
      ]
    },
    {
      "version": "1.37.0",
      "title": "Escudo regenerativo",
      "changes": [
        "Sustituida la armadura por escudo: absorbe daño antes de la vida y se regenera un 20 % de su capacidad por segundo tras 4 s sin recibir golpes.",
        "Capacidad inicial del 25 % de vida máxima. Mejoras, reliquias y evoluciones aumentan esa proporción; crece con la vida máxima. Barra propia en el HUD.",
        "Las partidas existentes convierten cada punto de armadura en un 10 % adicional de vida máxima como escudo."
      ]
    },
    {
      "version": "1.36.0",
      "title": "Cofres digitales",
      "changes": [
        "Cofres renovados con armadura, refuerzos dorados, cierre luminoso y núcleo flotante animado.",
        "Los cofres gratuitos de enemigos tienen un modelo propio más grande, luces turquesas, partículas ascendentes y un indicador GRATIS visible al acercarse."
      ]
    },
    {
      "version": "1.35.6",
      "title": "Mejoras entre evoluciones",
      "changes": [
        "Digievolucionar ya no reduce la velocidad acumulada cuando supera 12.",
        "Los ataques en cadena aprovechan el área acumulada para su alcance.",
        "Verificada la conservación de mejoras desde Rookie hasta Mega y al guardar y cargar."
      ]
    },
    {
      "version": "1.35.5",
      "title": "Indicador del salto",
      "changes": [
        "El salto muestra disponibilidad y segundos de recarga bajo el Digimon, con el mismo estilo que la habilidad Q, y en el panel lateral. Respeta la tecla configurada."
      ]
    },
    {
      "version": "1.35.4",
      "title": "Recolección orbital y habilidades Q",
      "changes": [
        "Satélite de datos envía sus orbes al fragmento de experiencia libre más cercano y lo transporta al Digimon. Cada orbe recoge un fragmento distinto.",
        "Las Q aumentan su potencia con fuerza, etapa evolutiva y rango de técnicas; aprovechan área, cadencia y proyectiles adicionales según su función. Refuerzo también potencia su daño.",
        "Aumentado el daño de las Q para mantenerlas útiles durante la run."
      ]
    },
    {
      "version": "1.35.3",
      "title": "Flechas de incubación",
      "changes": [
        "Las flechas de la incubadora permanecen visibles al pasar el cursor o pulsarlas, sin el panel verde superpuesto."
      ]
    },
    {
      "version": "1.35.2",
      "title": "Bonificaciones de cuenta",
      "changes": [
        "El juego recoge las bonificaciones asignadas por administración al iniciar sesión o actualizar la clasificación.",
        "Los bits se suman al saldo local y se guardan junto a un recibo para evitar duplicados en ese perfil. No se modifican huevos ni mejoras."
      ]
    },
    {
      "version": "1.35.1",
      "title": "Botones estables y acceso a incubación",
      "changes": [
        "Incubar y Jugar mantienen su tamaño y posición al pasar el cursor; conservan el cambio de color.",
        "Retirado el acceso directo a Incubadora del menú inicial. Se entra seleccionando un huevo y pulsando Incubar."
      ]
    },
    {
      "version": "1.35.0",
      "title": "Nuevos menús de huevos e incubación",
      "changes": [
        "Nuevos fondos y botones proporcionados para Jugar e Incubadora, con doce cápsulas y huevos animados.",
        "Selección con borde naranja; Incubar y Jugar aparecen al seleccionar un huevo. Los huevos bloqueados se desbloquean desde Incubar.",
        "Vista previa de la línea evolutiva al mantener el cursor o el foco sobre un huevo.",
        "Incubación con seis etapas a la izquierda, Digimon animado en el centro y flechas para cambiar la evolución elegida. Cuatro mejoras con coste y nivel a la derecha.",
        "Se conservan los huevos, las mejoras, los bits y las rutas guardadas. El panel adapta su tamaño a la ventana y a la escala de interfaz."
      ]
    },
    {
      "version": "1.34.0",
      "title": "Ataques con más fuerza visual",
      "changes": [
        "Renovadas las 64 técnicas, incluidos el ataque básico y las habilidades de apoyo: siluetas más marcadas, colores más vivos, estelas con núcleo luminoso e iluminación breve sobre el suelo.",
        "Fuego con turbulencia y llamaradas, Fuerza Terra con núcleo solar, fénix con plumas, agua con salpicaduras curvas, hielo con escarcha y electricidad con ramificaciones más visibles. Los rayos verticales también zigzaguean.",
        "Nuevos arcos de garras y viento, pétalos y polen, plumas y halos sagrados, coronas de oscuridad, fragmentos mecánicos y golpes con destellos angulares.",
        "Escudo con trama hexagonal, símbolos de curación, impulsos de velocidad y auras de concentración y potenciación.",
        "Los efectos conservan la opacidad configurable, el presupuesto máximo de partículas y los tiempos de impacto. Las texturas y materiales se reutilizan; daño, alcance, cadencia y estados de combate se mantienen."
      ]
    },
    {
      "version": "1.33.0",
      "title": "Experiencia de portales y regreso con margen",
      "changes": [
        "Completar un portal recoge automáticamente todos los fragmentos de experiencia que queden dentro, incluido el de la última baja. Conserva los multiplicadores, los puntos y la curación de la recogida normal.",
        "Las partidas guardadas con un portal ya completado también recogen los fragmentos pendientes al volver a la isla. Salir de un portal sin completar mantiene su experiencia dentro para la próxima visita.",
        "Al volver de cualquier portal, los enemigos quedan quietos medio segundo y recuperan gradualmente su velocidad durante los tres segundos siguientes. La recuperación se conserva al guardar y se detiene con los menús y las cargas.",
        "Eliminada la aparición instantánea de grupos al regresar: el primer grupo espera entre 1,5 y 3 segundos. Los grupos siguientes varían su intervalo habitual un 20 % y respetan el límite de enemigos."
      ]
    },
    {
      "version": "1.32.0",
      "title": "Tamaño de interfaz y clasificación semanal",
      "changes": [
        "Nuevo control en Ajustes para cambiar el tamaño de la interfaz entre el 70 % y el 130 %, con aplicación inmediata, guardado en este PC y botón para restaurar el 100 %. El escenario conserva su tamaño.",
        "Las pantallas de elección respetan la escala elegida y se siguen ajustando para entrar completas en la ventana.",
        "La clasificación se renueva cada lunes a las 00:00, hora de Madrid, sin borrar el histórico. El reinicio semanal ya está activo en el servidor.",
        "Los nuevos resultados pendientes conservan la fecha de finalización para clasificarse en su semana al recuperar la conexión."
      ]
    },
    {
      "version": "1.31.1",
      "title": "Técnicas visibles en partida y vendedor sin scroll",
      "changes": [
        "El dispositivo de técnicas aparece arriba a la izquierda durante las partidas, con los emblemas de las habilidades equipadas en sus cuatro huecos. Se actualiza al aprender, mejorar, sustituir o quitar técnicas.",
        "El tamaño del dispositivo se adapta a la altura de la ventana para dejar espacio al panel de vida y experiencia.",
        "Las tarjetas del vendedor se reparten por igual y la pantalla de elección se ajusta entera a la ventana, sin scroll ni tarjetas cortadas.",
        "El ajuste también se aplica a las recompensas compradas y responde a los cambios de tamaño de ventana."
      ]
    },
    {
      "version": "1.31.0",
      "title": "Tarjetas y emblemas de técnicas",
      "changes": [
        "Las 64 técnicas usan sus tarjetas ilustradas en el catálogo y al elegir, mejorar, sustituir o quitar una técnica.",
        "El menú de equipo incorpora el dispositivo de técnicas con cuatro huecos numerados y el emblema de cada técnica equipada. Selecciona un emblema para consultar su nombre, etapa, rango y descripción; los huecos libres permanecen vacíos.",
        "Los emblemas también acompañan a las técnicas en la barra de combate.",
        "Las mejoras de estadísticas usan los nuevos marcos por rareza: verde común, cian raro, magenta épico y amarillo legendario. También aparecen al comprar mejoras en la tienda.",
        "Ajustados el contraste del texto, el foco del teclado y la distribución del equipo para ventanas pequeñas."
      ]
    },
    {
      "version": "1.30.1",
      "title": "Invasores y distancia de aparición",
      "changes": [
        "Solo los invasores garantizan un cofre. Los enemigos normales y élites comparten la probabilidad baja del 0,1 %, mejorable con objetos.",
        "Enemigos e invasores aparecen a 38–50 unidades del jugador, tanto en la isla como en los portales.",
        "Las posiciones fuera del mapa se descartan: acercarse al borde o a una esquina ya no permite apariciones demasiado cercanas."
      ]
    },
    {
      "version": "1.30.0",
      "title": "Paisaje digital y viajes de datos",
      "changes": [
        "Paisaje con praderas de colores, senderos suaves, claros en los puntos de interés, árboles de dos formas, rocas con musgo, flores y grupos de cristales.",
        "Piedras digitales y partículas ambientales discretas, con geometría instanciada para limitar el coste gráfico.",
        "Al comenzar o continuar una partida, el Digimon se reconstruye a partir de fragmentos de su propio sprite.",
        "Al entrar y salir de los portales, el Digimon se desmaterializa en datos y se materializa en el destino, con anillos y un barrido de luz.",
        "Pantalla de carga con una cuadrícula digital animada. El combate y el reloj permanecen detenidos durante toda la transición.",
        "Animación breve de fundido si el sistema tiene activada la reducción de movimiento."
      ]
    },
    {
      "version": "1.29.0",
      "title": "Supervivencia, cofres y menú de equipo",
      "changes": [
        "Tabulador abre y cierra el menú de equipo: objetos y compañeros a la izquierda, sprite del Digimon en el centro y estadísticas a la derecha. La partida se pausa y desaparece la lista lateral de objetos.",
        "Desde el minuto 15, la dificultad recibe un multiplicador adicional que se duplica cada 2 minutos. Vida, daño, velocidad y cadencia siguen aumentando en supervivencia.",
        "Solo 6 cofres en la isla y 2 por portal. Cada apertura sube el precio global: 100, 190, 310, 460… Se conserva entre mapas y partidas guardadas.",
        "Cofre por enemigo normal: 0,1 %; por élite: 100 %. Los cofres caídos duran 60 segundos de partida. Radar de tesoros y Antena de botín elevan ligeramente la probabilidad normal, hasta 0,325 % combinados en rango 3.",
        "Wizardmon solo permite quitar técnicas gratis. Las técnicas se aprenden al subir de nivel con huecos libres.",
        "Fase evolutiva visible en las técnicas y descripciones breves del tipo de ataque.",
        "La corrupción del portal se mantiene durante la caída de la torre; el regreso ocurre con la transición cubierta. La isla genera encuentros nuevos al volver, conservando un Devimon activo y su vida.",
        "Compatibilidad con partidas anteriores y antiguos menús del vendedor."
      ]
    },
    {
      "version": "1.28.1",
      "title": "Marco digital para el minimapa",
      "changes": [
        "El minimapa utiliza el dispositivo proporcionado como marco, con el mapa en su pantalla transparente.",
        "Conserva los iconos de colores y la leyenda; el botón azul permite abrir el mapa ampliado.",
        "Tamaño adaptado a ventanas pequeñas y rótulo de mapa durante el combate."
      ]
    },
    {
      "version": "1.28.0",
      "title": "Mapa a color y panel digital del personaje",
      "changes": [
        "Iconos de colores en el minimapa, el mapa ampliado y sus leyendas para reconocer cofres, tiendas, descansos, santuarios, portales y enemigos de un vistazo.",
        "Nuevo fondo digital azul proporcionado para el panel del personaje durante la partida, con vida y experiencia de alto contraste.",
        "Ajustados los márgenes del panel y la posición del equipo para mantener la información dentro del marco y evitar solapamientos."
      ]
    },
    {
      "version": "1.27.0",
      "title": "Línea evolutiva e iconos en la incubadora",
      "changes": [
        "Elige tu línea hasta Mega antes de jugar, con una fila horizontal de iconos animados y opciones por etapa.",
        "La línea se guarda por huevo y cuenta. Las digievoluciones se aplican automáticamente en combate al alcanzar los niveles 3, 6, 12, 20 y 30.",
        "Las pasivas funcionan sin quedarse quieto: defensa, velocidad y marca automática, regeneración, ralentización cercana, alcance o inmunidad al agua según el estilo.",
        "Descripciones de técnicas más breves, centradas en su efecto principal, estado y recarga.",
        "Compatibilidad con partidas guardadas, incluidas las antiguas detenidas en una elección de digievolución."
      ]
    },
    {
      "version": "1.26.0",
      "title": "Nivel 400 y calidad de mejoras",
      "changes": [
        "Nivel máximo 400 y curva de experiencia más exigente.",
        "Técnicas nuevas al subir de nivel solo si hay menos de cuatro equipadas. Wizardmon permite quitar una gratis.",
        "Tarjetas de mejora comunes, raras, épicas y legendarias; predominan las pequeñas. Proyectiles extra es una mejora épica.",
        "Nuevo Chip de selección: aumenta la probabilidad de mejores tarjetas de estadísticas según su rango."
      ]
    },
    {
      "version": "1.25.0",
      "title": "Técnicas claras y compras en Wizardmon",
      "changes": [
        "Wizardmon vende las técnicas nuevas y permite sustituir las equipadas. Los niveles mejoran atributos o técnicas actuales.",
        "Descripciones con funcionamiento, golpes por activación, daño, recarga y tamaño.",
        "El área aumenta también el tamaño visible de proyectiles, cortes y efectos.",
        "Los proyectiles extra añaden disparos o golpes a todas las técnicas ofensivas, incluso contra un solo enemigo."
      ]
    },
    {
      "version": "1.24.0",
      "title": "Fortuna y música de Devimon",
      "changes": [
        "Eliminada la opción de arriesgar recompensas de cofres y tiendas.",
        "Nuevo Talismán de la fortuna: +2, +4 o +6 puntos porcentuales de probabilidad de legendario según su rango. Las probabilidades visibles reflejan el efecto.",
        "Canción dedicada durante la pelea contra Devimon, en bucle y con el volumen de Ajustes."
      ]
    },
    {
      "version": "1.23.5",
      "title": "Objetos sin límite y cofres más caros",
      "changes": [
        "Eliminado el límite de cuatro reliquias. Los cofres cuestan 30 bits en lugar de 15, también en partidas guardadas. Se mantienen los rangos de calidad y el límite de tres compañeros."
      ]
    },
    {
      "version": "1.23.4",
      "title": "Tamaño por fase evolutiva",
      "changes": [
        "Los Digimon crecen en cada fase, desde Bebé I hasta Mega. Se aplica al jugador, compañeros y enemigos, con sombras proporcionales y escala corregida según la altura real de los sprites."
      ]
    },
    {
      "version": "1.23.3",
      "title": "Música por bioma",
      "changes": [
        "Canciones propias para los biomas volcánico, inundado y corrupto, en bucle, con reinicio al entrar y volumen guardado. Incluye todos los cambios anteriores."
      ]
    },
    {
      "version": "1.23.2",
      "title": "Música desde el principio",
      "changes": [
        "La música del menú y de la isla vuelve a comenzar al entrar en cada escenario. Pausar dentro del mismo mapa conserva la posición. Incluye los banners y el volumen guardado de 1.23.1."
      ]
    },
    {
      "version": "1.23.1",
      "title": "Banners del menú y volumen de música",
      "changes": [
        "Opciones del menú principal con el banner digital proporcionado.",
        "Control de volumen de música en Ajustes, con porcentaje y guardado entre sesiones."
      ]
    },
    {
      "version": "1.23.0",
      "title": "Técnicas renovadas y música original",
      "changes": [
        "Renovadas las 64 técnicas, sus proyectiles, impactos y efectos de apoyo.",
        "Música Digibonk Intro en el menú y Digibonk Mapa 1 en la isla principal.",
        "Las torres de los portales pierden vida al derrotar enemigos y se destruyen al completar la tercera oleada.",
        "Galería de técnicas para revisión visual y mejoras de rendimiento de efectos."
      ]
    },
    {
      "version": "1.22.2",
      "title": "Información agrupada",
      "changes": [
        "Técnicas y objetos y Cómo jugar se agrupan en Información. Retirado el acceso Récords del menú principal. Incluye el inicio centrado y la clasificación visible de 1.22.1."
      ]
    },
    {
      "version": "1.22.1",
      "title": "Inicio centrado y clasificación visible",
      "changes": [
        "Logotipo y opciones centrados. Panel de Liga y cuenta visible junto al menú; en pantallas pequeñas aparece debajo. El inicio permite desplazamiento sin cortar botones. La clasificación mantiene el acceso mediante inicio de sesión."
      ]
    },
    {
      "version": "1.22.0",
      "title": "Menú principal y marcos de rareza",
      "changes": [
        "Menú principal con Jugar, Incubadora, Técnicas y objetos, Récords, Liga y cuenta, Ajustes y Cómo jugar.",
        "Huevos bloqueados en gris y oscurecidos, con indicación de bloqueo.",
        "Marcos personalizados en el carrusel y en la recompensa revelada: plateado común, azul raro, morado épico y dorado legendario.",
        "Código fuente formateado para facilitar su lectura."
      ]
    },
    {
      "version": "1.21.1",
      "title": "Corrección de bloqueo de arranque",
      "changes": [
        "Restaurado el inicio del renderizador, el bucle de juego y los manejadores de combate que faltaban en el archivo principal desde la separación de Incubadora. Corrige la pantalla detenida en Preparando escenario. Nuevas pruebas del arranque y de finalización de la transición de carga. Conserva las partidas y la incubadora."
      ]
    },
    {
      "version": "1.21.0",
      "title": "Oleadas progresivas y tandas de enemigos",
      "changes": [
        "Los enemigos de las oleadas y refuerzos de portal aparecen progresivamente. La siguiente oleada espera a que se agote la cola y se derroten los enemigos. El progreso pendiente se conserva al guardar y salir.",
        "Tandas de una misma especie durante 35 segundos, dentro y fuera de portales. La dificultad sigue aumentando población y atributos; jefes independientes.",
        "Preparación de efectos repartida entre fotogramas y precálculo de recortes de sprites durante la carga para reducir tirones.",
        "Validación: 119 pruebas del juego. Pendiente medir los tirones en una partida real."
      ]
    },
    {
      "version": "1.20.2",
      "title": "Nuevo logotipo",
      "changes": [
        "Logotipo personalizado de Digibonk en el inicio y la cabecera, adaptado al tamaño de pantalla."
      ]
    },
    {
      "version": "1.20.1",
      "title": "Publicación de la incubadora",
      "changes": [
        "Incluye el inicio simplificado, pestaña Incubadora y saldo de bits visible. Reintentos ante fallos transitorios del servicio de publicación."
      ]
    },
    {
      "version": "1.20.0",
      "title": "Incubadora separada",
      "changes": [
        "Inicio simplificado con pestañas Jugar e Incubadora. Selecciona un huevo y juega desde el inicio; mejora su calidad y atributos o desbloquea nuevos huevos en Incubadora. Saldo de bits destacado junto a las pestañas y en el panel de mejoras, actualizado tras cada compra."
      ]
    },
    {
      "version": "1.19.0",
      "title": "Animaciones elementales",
      "changes": [
        "Nuevas cargas convergentes y estelas helicoidales para las técnicas. Impactos animados por familia: brasas parabólicas, coronas fluidas, cristales, espirales astrales, pétalos y trazos cinéticos. Escala por etapa evolutiva, desvanecimiento gradual y presupuesto compartido de partículas."
      ]
    },
    {
      "version": "1.18.0",
      "title": "Incubadora y efectos de combate",
      "changes": [
        "Huevos y ramas desbloqueables con bits permanentes; mejoras de atributos por huevo; 16 objetos nuevos; partículas de vuelo, preparación e impactos por elemento."
      ]
    },
    {
      "version": "1.17.0",
      "title": "Actualización",
      "changes": [
        "Cuenta atrás visible de 3 minutos para entrar en un portal. Se suspende dentro y se renueva solo al purificar una Torre Negra. Salir sin cerrar no reinicia el plazo.",
        "Llegar tarde potencia a los enemigos desde ×2 de vida y ×1,5 de daño; cuanto más se demora la entrada, más aumenta la penalización.",
        "La dificultad global acelera con el tiempo, incluso dentro de portales y en supervivencia después de Devimon. Se ajustan los enemigos presentes conservando su porcentaje de vida restante.",
        "Dentro de un portal la presión temporal sigue creciendo, pero el nivel de entrada y las etapas enemigas se mantienen hasta reentrar. Se conservan los límites de población y velocidad.",
        "Arriesgar una recompensa tiene ahora 20 % de éxito y 80 % de cofre vacío. Se aplica también a las mejoras compradas; la probabilidad y el resultado se guardan antes de la animación. Las tiradas antiguas ya resueltas se conservan.",
        "El carrusel muestra muchos más cofres vacíos al arriesgar, acorde con la nueva probabilidad.",
        "El reloj se conserva al guardar y se detiene en pausa, menús y cargas. Las partidas anteriores reciben un primer plazo de 3 minutos."
      ]
    },
    {
      "version": "1.16.0",
      "title": "Actualización",
      "changes": [
        "Once estados para enemigos: quemadura, veneno, sangrado, escarcha, congelación, parálisis, empapado, maldición, fisura de datos, raíces y debilidad.",
        "Los ataques muestran su probabilidad, duración y efecto. Los proyectiles, golpes cuerpo a cuerpo y técnicas de área aplican estados al impactar.",
        "Agua + electricidad: Empapado potencia una descarga un 25 % y se consume. Maldición y Fisura no suman sus vulnerabilidades: se usa la mayor.",
        "Daño periódico sin críticos ni reaplicación recursiva; se refresca el mismo estado sin acumular cargas. Las bajas conservan monedas y experiencia.",
        "Congelación y parálisis detienen movimiento y ataques; las raíces permiten atacar. Comparten una protección de 3 s tras el control para impedir bloqueos permanentes.",
        "Los jefes convierten controles en escarcha, reciben la mitad del daño periódico y reducen la vulnerabilidad y conducción. Las torres son inmunes.",
        "Iconos con temporizador sobre cada enemigo, efectos visuales y pestaña Estados en el catálogo. Los materiales nuevos se preparan durante la carga.",
        "Los estados se guardan con cada escena, se detienen durante la pausa y conservan el veneno de partidas anteriores."
      ]
    },
    {
      "version": "1.15.1",
      "title": "Actualización",
      "changes": [
        "Versión visible debajo del nombre del juego en la pantalla de inicio. El empaquetado la genera a partir de version.txt, igual que los ejecutables, para identificar la versión que estás jugando."
      ]
    },
    {
      "version": "1.15.0",
      "title": "Actualización",
      "changes": [
        "28 objetos en cofres (20 nuevos): crítico, cadencia, daño, vida, área, armadura, regeneración, movimiento, recogida, experiencia y efectos al esquivar, hacer críticos o derrotar enemigos.",
        "Cinco legendarios únicos: Digitama del renacer, Fragmento de Apocalymon, Reloj de Clockmon, Singularidad digital y Corazón de tormenta. Tienen efectos propios, recargas y protección frente a activaciones recursivas.",
        "Nueva calidad legendaria en cofres. La mejora arriesgada sigue teniendo 60 % de éxito y 40 % de quedarse sin premio; puede alcanzar legendario si hay un hueco disponible. Las compras de atributos conservan tres calidades.",
        "24 técnicas nuevas inspiradas en las familias de Next Order; 64 técnicas en total. Conos, columnas, meteoritos, lluvia, hielo, aurora, tornados, raíces, veneno, sombras, rayos sagrados y efectos mecánicos con animaciones propias.",
        "Veneno y ralentización reales; áreas retardadas que se conservan con la escena y no atacan a través de portales.",
        "Al subir de nivel se ofrece al menos una técnica nueva si hay alguna compatible. Se pueden combinar ataques de la misma familia en huecos separados. Si ya llevas cuatro técnicas, eliges cuál sustituir o conservas las actuales.",
        "Catálogo Técnicas y objetos con familias, etapas, efectos, recargas y equipo actual.",
        "Se conserva la dificultad progresiva de portales de 1.14.2: primer portal más accesible, presión creciente con cada portal cerrado."
      ]
    },
    {
      "version": "1.14.2",
      "title": "Actualización",
      "changes": [
        "Primer portal más accesible: oleadas base de 18, 28 y 40 enemigos, menos élites y enemigos a distancia, proyectiles más lentos y menor resistencia y daño.",
        "Cada portal cerrado aumenta progresivamente las multitudes, los atributos enemigos, los élites y los refuerzos. El orden de exploración es libre.",
        "La primera Torre Negra tiene menos vida y recibe refuerzos más pequeños y espaciados. Se mantiene el ajuste al nivel, tiempo y compras al entrar.",
        "Las partidas con un portal activo reciben el nuevo balance al continuar conservando su progreso y el porcentaje de vida restante de enemigos y torre."
      ]
    },
    {
      "version": "1.14.1",
      "title": "Actualización",
      "changes": [
        "Las mejoras compradas en la tienda se revelan en el carrusel con calidad común, rara o épica (65/28/7 % cuando están disponibles las tres).",
        "Cada calidad multiplica el incremento base por 1, 2 o 3. Se muestra el efecto real respetando los límites de atributos.",
        "Se puede arriesgar una vez por otra calidad del mismo atributo: 60 % de éxito y 40 % de perder la compra, sin devolución.",
        "Se paga una sola vez; las estadísticas se aplican al recoger y el resultado se conserva al continuar."
      ]
    },
    {
      "version": "1.14.0",
      "title": "Actualización",
      "changes": [
        "Cofres con carrusel animado y recompensa de calidad común, rara o épica. La calidad determina el rango de la reliquia.",
        "Una oportunidad de cambiar la recompensa: 60 % de obtener otra de mayor calidad y 40 % de quedarse sin premio. Se muestran las probabilidades antes de arriesgar.",
        "El resultado queda guardado antes de la animación y se conserva al continuar.",
        "Iconos originales de Digimon Heroes para objetos y recursos, con atribución en CREDITOS-SPRITES.md.",
        "Se mantienen cuatro reliquias, tres compañeros y la opción de cerrar sin recoger.",
        "Abre Digibonk.exe para actualizar."
      ]
    },
    {
      "version": "1.13.0",
      "title": "Actualización",
      "changes": [
        "Fuego con núcleo incandescente y turbulencia animada; Fuerza Terra con filamentos de plasma alrededor del núcleo.",
        "Estelas luminosas que siguen la trayectoria reciente real de cada proyectil y desaparecen al terminar.",
        "Agua con reflejos en movimiento, espuma adicional, coronas de salpicaduras y ondas sobre el suelo.",
        "Hielo, misiles y puños con iluminación y relieve; electricidad con ramificaciones y rayos sagrados con estela suave.",
        "Impactos con ondas de presión, chispas direccionales, sellos de luz y remolinos oscuros; explosiones con un breve núcleo luminoso local.",
        "Los nuevos programas gráficos se preparan durante la pantalla de carga. Se conservan los límites de partículas, proyectiles y opacidad configurable.",
        "Cambios visuales: daño, alcance, recargas y recompensas se mantienen. Abre Digibonk.exe para actualizar."
      ]
    }
  ]
};
