// ── NAVA PEACE — Internationalization ───────────────────────────────
// 8 languages: EN FR ES PT DE AR ZH RU
// Usage: include this script, then call applyLang(detectLang())

const NAVA_TRANSLATIONS = {

  en: {
    // Common
    tagline:            'TODAY HUMANITY CHOOSE PEACE',
    nav_peace:          'PEACE',
    nav_map:            'MAP',
    nav_profile:        'PROFILE',
    nav_about:          'ABOUT',
    // Registration
    lbl_country:        'Country',
    lbl_age:            'Age',
    lbl_gender:         'Gender',
    ph_country:         'Select your country',
    ph_age:             'Enter your age',
    ph_gender:          'Select',
    gender_male:        'Male',
    gender_female:      'Female',
    gender_other:       'Other',
    gender_pns:         'Prefer not to say',
    btn_join:           'JOIN THE PEACE MAP',
    footer_note:        'BE THE CHANGE YOU WANT TO SEE IN THE WORLD',
    // Peace page
    msg_for1:           'TODAY, FOR ME,',
    msg_for2:           'FOR YOU, FOR US,',
    msg_want:           'I WANT PEACE',
    msg_for3:           'AROUND THE WORLD',
    done_thank:         'THANK YOU PEACE LOVER',
    done_sub:           'YOU HAVE CHOSEN PEACE TODAY',
    done_timer_label:   'NEXT ACTION IN',
    cnt_today_lbl:      'TODAY',
    cnt_total_lbl:      'TOTAL ACTIONS',
    // Map page
    lbl_peace_lovers:   'PEACE LOVERS',
    lbl_countries:      'COUNTRIES REPRESENTED',
    lbl_today_map:      'GLOBAL ACTIONS TODAY',
    lbl_days:           'DAYS',
    lbl_since:          'SINCE LAUNCH',
    lbl_follow:         'FOLLOW US',
    // Profile page
    profile_tagline:    'COMMUNITY PROFILE',
    section_profile:    'YOUR PROFILE',
    section_doves:      'MY DOVES',
    dove_total_lbl:     'TOTAL DOVES',
    dove_own_lbl:       'OWN\nACTIONS',
    dove_ref_lbl:       'REFERRAL\nDOVES',
    section_invite:     'INVITE FRIENDS',
    copy_btn:           'COPY',
    lbl_friends:        'FRIENDS',
    lbl_invited:        'INVITED',
    lbl_doves:          'DOVES',
    lbl_from_actions:   'FROM THEIR ACTIONS',
    section_age:        'AGE DISTRIBUTION',
    section_gender:     'GENDER DISTRIBUTION',
    edit_btn:           'EDIT',
    cancel_btn:         'CANCEL',
    save_btn:           'SAVE',
    close_btn:          'CLOSE',
    copied_lbl:         '✓ COPIED',
    popup_my_doves:     'MY DOVES',
    popup_own_lbl:      'OWN ACTIONS',
    popup_ref_lbl:      'REFERRAL',
    no_data_profile:    'VOTE FIRST TO SEE YOUR PROFILE',
    lbl_country_badge:  'COUNTRY',
    lbl_age_badge:      'AGE',
    lbl_gender_badge:   'GENDER',
    lbl_days_badge:     'DAYS',
    lbl_edit_country:   'COUNTRY (2-LETTER CODE)',
    lbl_select:         '— SELECT —',
    generating_link:    'GENERATING LINK...',
    // About page
    about_tagline:      'ABOUT THE MOVEMENT',
    mission_lbl:        'Our Mission',
    mission_p1:         'NAVA PEACE is a global daily movement.\nEvery day, people from every country\nmake one simple commitment:\n\nTo choose peace.',
    mission_p2:         'Our goal is to demonstrate in real time, on a living world map, that humanity chooses peace. Not as a dream. As a daily act.',
    how_lbl:            'How It Works',
    step1_title:        'Register',
    step1_desc:         'Join once. Share your country, age and gender. No account, no password, no email — your privacy is protected.',
    step2_title:        'Choose Peace Every Day',
    step2_desc:         'Return each day and press the button. Your voice is counted on the global map. Every click is a real commitment.',
    step3_title:        'Invite Friends',
    step3_desc:         'Receive a unique personal code. Share it via WhatsApp, Telegram, Instagram or SMS. Every friend who joins expands the movement.',
    step4_title:        'Earn Doves',
    step4_desc:         'Your peace impact grows daily. Earn a Dove for every day you act, and another for each day a friend you invited acts.',
    dove_lbl:           'The Dove',
    dove_score:         'Your Peace Score',
    dove_desc:          'The Dove is NAVA PEACE\'s symbol of individual impact.\nIt rewards consistency and inspires others to join.\nEvery Dove represents a real act of peace —\nyours or someone you inspired.',
    dove_per_day:       '+1 Dove\nPer Day\nYou Act',
    dove_per_friend:    '+1 Dove\nPer Friend\'s\nDaily Action',
    principles_lbl:     'Our Principles',
    p_anon_name:        'Anonymous',
    p_anon_text:        'No name, no email. We only collect your country, age and gender to understand who chooses peace.',
    p_univ_name:        'Universal',
    p_univ_text:        'Open to every human being on Earth, from every country, culture and background.',
    p_daily_name:       'Daily',
    p_daily_text:       'Peace is not a single act. Returning each day is what makes the movement real and powerful.',
    p_free_name:        'Free',
    p_free_text:        'Always free. No subscriptions, no ads, no monetization. This is a movement, not a product.',
    p_trans_name:       'Transparent',
    p_trans_text:       'All data is public and visible on the live world map. No hidden numbers, no manipulation.',
    cta_btn:            '🕊  Join the Peace Map',
  },

  fr: {
    tagline:            "AUJOURD'HUI L'HUMANITÉ CHOISIT LA PAIX",
    nav_peace:          'PAIX',
    nav_map:            'CARTE',
    nav_profile:        'PROFIL',
    nav_about:          'À PROPOS',
    lbl_country:        'Pays',
    lbl_age:            'Âge',
    lbl_gender:         'Genre',
    ph_country:         'Sélectionnez votre pays',
    ph_age:             'Entrez votre âge',
    ph_gender:          'Sélectionner',
    gender_male:        'Homme',
    gender_female:      'Femme',
    gender_other:       'Autre',
    gender_pns:         'Préfère ne pas dire',
    btn_join:           'REJOINDRE LA CARTE DE LA PAIX',
    footer_note:        'SOYEZ LE CHANGEMENT QUE VOUS VOULEZ VOIR DANS LE MONDE',
    msg_for1:           "AUJOURD'HUI, POUR MOI,",
    msg_for2:           'POUR TOI, POUR NOUS,',
    msg_want:           'JE VEUX LA PAIX',
    msg_for3:           'À TRAVERS LE MONDE',
    done_thank:         'MERCI, AMOUREUX DE LA PAIX',
    done_sub:           "TU AS CHOISI LA PAIX AUJOURD'HUI",
    done_timer_label:   'PROCHAINE ACTION DANS',
    cnt_today_lbl:      "AUJOURD'HUI",
    cnt_total_lbl:      'TOTAL DES ACTIONS',
    lbl_peace_lovers:   'AMOUREUX DE LA PAIX',
    lbl_countries:      'PAYS REPRÉSENTÉS',
    lbl_today_map:      "ACTIONS MONDIALES AUJOURD'HUI",
    lbl_days:           'JOURS',
    lbl_since:          'DEPUIS LE LANCEMENT',
    lbl_follow:         'NOUS SUIVRE',
    profile_tagline:    'PROFIL COMMUNAUTAIRE',
    section_profile:    'VOTRE PROFIL',
    section_doves:      'MES COLOMBES',
    dove_total_lbl:     'TOTAL COLOMBES',
    dove_own_lbl:       'MES\nACTIONS',
    dove_ref_lbl:       'COLOMBES\nPARRAINAGE',
    section_invite:     'INVITER DES AMIS',
    copy_btn:           'COPIER',
    lbl_friends:        'AMIS',
    lbl_invited:        'INVITÉS',
    lbl_doves:          'COLOMBES',
    lbl_from_actions:   'DE LEURS ACTIONS',
    section_age:        "DISTRIBUTION D'ÂGE",
    section_gender:     'DISTRIBUTION DU GENRE',
    edit_btn:           'MODIFIER',
    cancel_btn:         'ANNULER',
    save_btn:           'ENREGISTRER',
    close_btn:          'FERMER',
    copied_lbl:         '✓ COPIÉ',
    popup_my_doves:     'MES COLOMBES',
    popup_own_lbl:      'MES ACTIONS',
    popup_ref_lbl:      'PARRAINAGE',
    no_data_profile:    "VOTEZ D'ABORD POUR VOIR VOTRE PROFIL",
    lbl_country_badge:  'PAYS',
    lbl_age_badge:      'ÂGE',
    lbl_gender_badge:   'GENRE',
    lbl_days_badge:     'JOURS',
    lbl_edit_country:   'PAYS (CODE 2 LETTRES)',
    lbl_select:         '— SÉLECTIONNER —',
    generating_link:    'GÉNÉRATION DU LIEN...',
    about_tagline:      'À PROPOS DU MOUVEMENT',
    mission_lbl:        'Notre Mission',
    mission_p1:         "NAVA PEACE est un mouvement mondial quotidien.\nChaque jour, des personnes de tous les pays\nprennent un engagement simple :\n\nChoisir la paix.",
    mission_p2:         "Notre but est de démontrer — en temps réel,\nsur une carte mondiale vivante — que l'humanité\nchoisit la paix. Pas comme un rêve.\nComme un acte quotidien.",
    how_lbl:            'Comment Ça Marche',
    step1_title:        "S'inscrire",
    step1_desc:         "Rejoignez-nous une seule fois. Indiquez votre pays, âge et genre. Aucun compte, aucun mot de passe, aucun email — votre vie privée est protégée.",
    step2_title:        'Choisir la Paix Chaque Jour',
    step2_desc:         "Revenez chaque jour et appuyez sur le bouton. Votre voix est comptée sur la carte mondiale. Chaque clic est un vrai engagement.",
    step3_title:        'Inviter des Amis',
    step3_desc:         'Recevez un code personnel unique. Partagez-le via WhatsApp, Telegram, Instagram ou SMS. Chaque ami qui rejoint élargit le mouvement.',
    step4_title:        'Gagner des Colombes',
    step4_desc:         "Votre impact pour la paix grandit chaque jour. Gagnez une Colombe pour chaque jour où vous agissez, et une autre pour chaque jour où un ami que vous avez invité agit.",
    dove_lbl:           'La Colombe',
    dove_score:         'Votre Score de Paix',
    dove_desc:          "La Colombe est le symbole d'impact de NAVA PEACE.\nElle récompense la constance et inspire les autres.\nChaque Colombe représente un vrai acte de paix —\lle vôtre ou celui de quelqu'un que vous avez inspiré.",
    dove_per_day:       '+1 Colombe\nPar Jour\nOù Vous Agissez',
    dove_per_friend:    "+1 Colombe\nPar Action\nD'un Ami",
    principles_lbl:     'Nos Principes',
    p_anon_name:        'Anonyme',
    p_anon_text:        "Pas de nom, pas d'email. Nous collectons uniquement votre pays, âge et genre pour comprendre qui choisit la paix.",
    p_univ_name:        'Universel',
    p_univ_text:        'Ouvert à chaque être humain sur Terre, de chaque pays, culture et origine.',
    p_daily_name:       'Quotidien',
    p_daily_text:       "La paix n'est pas un acte unique. Revenir chaque jour est ce qui rend le mouvement réel et puissant.",
    p_free_name:        'Gratuit',
    p_free_text:        "Toujours gratuit. Aucun abonnement, aucune publicité. C'est un mouvement, pas un produit.",
    p_trans_name:       'Transparent',
    p_trans_text:       'Toutes les données sont publiques et visibles sur la carte mondiale. Aucun chiffre caché, aucune manipulation.',
    cta_btn:            '🕊  Rejoindre la Carte de la Paix',
  },

  es: {
    tagline:            'HOY LA HUMANIDAD ELIGE LA PAZ',
    nav_peace:          'PAZ',
    nav_map:            'MAPA',
    nav_profile:        'PERFIL',
    nav_about:          'ACERCA',
    lbl_country:        'País',
    lbl_age:            'Edad',
    lbl_gender:         'Género',
    ph_country:         'Selecciona tu país',
    ph_age:             'Ingresa tu edad',
    ph_gender:          'Seleccionar',
    gender_male:        'Hombre',
    gender_female:      'Mujer',
    gender_other:       'Otro',
    gender_pns:         'Prefiero no decir',
    btn_join:           'UNIRSE AL MAPA DE LA PAZ',
    footer_note:        'SÉ EL CAMBIO QUE QUIERES VER EN EL MUNDO',
    msg_for1:           'HOY, POR MÍ,',
    msg_for2:           'POR TI, POR NOSOTROS,',
    msg_want:           'QUIERO PAZ',
    msg_for3:           'EN TODO EL MUNDO',
    done_thank:         'GRACIAS, AMANTE DE LA PAZ',
    done_sub:           'HAS ELEGIDO LA PAZ HOY',
    done_timer_label:   'PRÓXIMA ACCIÓN EN',
    cnt_today_lbl:      'HOY',
    cnt_total_lbl:      'ACCIONES TOTALES',
    lbl_peace_lovers:   'AMANTES DE LA PAZ',
    lbl_countries:      'PAÍSES REPRESENTADOS',
    lbl_today_map:      'ACCIONES GLOBALES HOY',
    lbl_days:           'DÍAS',
    lbl_since:          'DESDE EL LANZAMIENTO',
    lbl_follow:         'SÍGUENOS',
    profile_tagline:    'PERFIL COMUNITARIO',
    section_profile:    'TU PERFIL',
    section_doves:      'MIS PALOMAS',
    dove_total_lbl:     'TOTAL PALOMAS',
    dove_own_lbl:       'MIS\nACCIONES',
    dove_ref_lbl:       'PALOMAS\nDE REFERIDOS',
    section_invite:     'INVITAR AMIGOS',
    copy_btn:           'COPIAR',
    lbl_friends:        'AMIGOS',
    lbl_invited:        'INVITADOS',
    lbl_doves:          'PALOMAS',
    lbl_from_actions:   'DE SUS ACCIONES',
    section_age:        'DISTRIBUCIÓN DE EDAD',
    section_gender:     'DISTRIBUCIÓN DE GÉNERO',
    edit_btn:           'EDITAR',
    cancel_btn:         'CANCELAR',
    save_btn:           'GUARDAR',
    close_btn:          'CERRAR',
    copied_lbl:         '✓ COPIADO',
    popup_my_doves:     'MIS PALOMAS',
    popup_own_lbl:      'MIS ACCIONES',
    popup_ref_lbl:      'REFERIDOS',
    no_data_profile:    'VOTA PRIMERO PARA VER TU PERFIL',
    lbl_country_badge:  'PAÍS',
    lbl_age_badge:      'EDAD',
    lbl_gender_badge:   'GÉNERO',
    lbl_days_badge:     'DÍAS',
    lbl_edit_country:   'PAÍS (CÓDIGO 2 LETRAS)',
    lbl_select:         '— SELECCIONAR —',
    generating_link:    'GENERANDO ENLACE...',
    about_tagline:      'ACERCA DEL MOVIMIENTO',
    mission_lbl:        'Nuestra Misión',
    mission_p1:         'NAVA PEACE es un movimiento global diario.\nCada día, personas de todos los países\nasumen un compromiso simple:\n\nElegir la paz.',
    mission_p2:         'Nuestro objetivo es demostrar — en tiempo real,\nen un mapa mundial vivo — que la humanidad\nelige la paz. No como un sueño.\nComo un acto diario.',
    how_lbl:            'Cómo Funciona',
    step1_title:        'Registrarse',
    step1_desc:         'Únete una sola vez. Comparte tu país, edad y género. Sin cuenta, sin contraseña, sin email — tu privacidad está protegida.',
    step2_title:        'Elegir la Paz Cada Día',
    step2_desc:         'Vuelve cada día y presiona el botón. Tu voz se cuenta en el mapa global. Cada clic es un compromiso real.',
    step3_title:        'Invitar Amigos',
    step3_desc:         'Recibe un código personal único. Compártelo por WhatsApp, Telegram, Instagram o SMS. Cada amigo que se une amplía el movimiento.',
    step4_title:        'Ganar Palomas',
    step4_desc:         'Tu impacto de paz crece cada día. Gana una Paloma por cada día que actúas, y otra por cada día que actúa un amigo que invitaste.',
    dove_lbl:           'La Paloma',
    dove_score:         'Tu Puntuación de Paz',
    dove_desc:          'La Paloma es el símbolo de impacto de NAVA PEACE.\nPremia la constancia e inspira a otros a unirse.\nCada Paloma representa un acto real de paz —\nel tuyo o el de alguien que inspiraste.',
    dove_per_day:       '+1 Paloma\nPor Día\nQue Actúas',
    dove_per_friend:    '+1 Paloma\nPor Acción\nDe Un Amigo',
    principles_lbl:     'Nuestros Principios',
    p_anon_name:        'Anónimo',
    p_anon_text:        'Sin nombre, sin email. Solo recogemos tu país, edad y género para entender quién elige la paz.',
    p_univ_name:        'Universal',
    p_univ_text:        'Abierto a todo ser humano en la Tierra, de cualquier país, cultura y origen.',
    p_daily_name:       'Diario',
    p_daily_text:       'La paz no es un acto único. Volver cada día es lo que hace que el movimiento sea real y poderoso.',
    p_free_name:        'Gratuito',
    p_free_text:        'Siempre gratis. Sin suscripciones, sin anuncios. Esto es un movimiento, no un producto.',
    p_trans_name:       'Transparente',
    p_trans_text:       'Todos los datos son públicos y visibles en el mapa mundial en vivo. Sin números ocultos, sin manipulación.',
    cta_btn:            '🕊  Unirse al Mapa de la Paz',
  },

  pt: {
    tagline:            'HOJE A HUMANIDADE ESCOLHE A PAZ',
    nav_peace:          'PAZ',
    nav_map:            'MAPA',
    nav_profile:        'PERFIL',
    nav_about:          'SOBRE',
    lbl_country:        'País',
    lbl_age:            'Idade',
    lbl_gender:         'Gênero',
    ph_country:         'Selecione seu país',
    ph_age:             'Digite sua idade',
    ph_gender:          'Selecionar',
    gender_male:        'Masculino',
    gender_female:      'Feminino',
    gender_other:       'Outro',
    gender_pns:         'Prefiro não dizer',
    btn_join:           'ENTRAR NO MAPA DA PAZ',
    footer_note:        'SEJA A MUDANÇA QUE VOCÊ QUER VER NO MUNDO',
    msg_for1:           'HOJE, POR MIM,',
    msg_for2:           'POR VOCÊ, POR NÓS,',
    msg_want:           'EU QUERO PAZ',
    msg_for3:           'AO REDOR DO MUNDO',
    done_thank:         'OBRIGADO, AMANTE DA PAZ',
    done_sub:           'VOCÊ ESCOLHEU A PAZ HOJE',
    done_timer_label:   'PRÓXIMA AÇÃO EM',
    cnt_today_lbl:      'HOJE',
    cnt_total_lbl:      'AÇÕES TOTAIS',
    lbl_peace_lovers:   'AMANTES DA PAZ',
    lbl_countries:      'PAÍSES REPRESENTADOS',
    lbl_today_map:      'AÇÕES GLOBAIS HOJE',
    lbl_days:           'DIAS',
    lbl_since:          'DESDE O LANÇAMENTO',
    lbl_follow:         'SIGA-NOS',
    profile_tagline:    'PERFIL COMUNITÁRIO',
    section_profile:    'SEU PERFIL',
    section_doves:      'MINHAS POMBAS',
    dove_total_lbl:     'TOTAL POMBAS',
    dove_own_lbl:       'MINHAS\nAÇÕES',
    dove_ref_lbl:       'POMBAS\nDE INDICAÇÃO',
    section_invite:     'CONVIDAR AMIGOS',
    copy_btn:           'COPIAR',
    lbl_friends:        'AMIGOS',
    lbl_invited:        'CONVIDADOS',
    lbl_doves:          'POMBAS',
    lbl_from_actions:   'DE SUAS AÇÕES',
    section_age:        'DISTRIBUIÇÃO DE IDADE',
    section_gender:     'DISTRIBUIÇÃO DE GÊNERO',
    edit_btn:           'EDITAR',
    cancel_btn:         'CANCELAR',
    save_btn:           'SALVAR',
    close_btn:          'FECHAR',
    copied_lbl:         '✓ COPIADO',
    popup_my_doves:     'MINHAS POMBAS',
    popup_own_lbl:      'MINHAS AÇÕES',
    popup_ref_lbl:      'INDICAÇÃO',
    no_data_profile:    'VOTE PRIMEIRO PARA VER SEU PERFIL',
    lbl_country_badge:  'PAÍS',
    lbl_age_badge:      'IDADE',
    lbl_gender_badge:   'GÊNERO',
    lbl_days_badge:     'DIAS',
    lbl_edit_country:   'PAÍS (CÓDIGO 2 LETRAS)',
    lbl_select:         '— SELECIONAR —',
    generating_link:    'GERANDO LINK...',
    about_tagline:      'SOBRE O MOVIMENTO',
    mission_lbl:        'Nossa Missão',
    mission_p1:         'NAVA PEACE é um movimento global diário.\nCada dia, pessoas de todos os países\nassumem um compromisso simples:\n\nEscolher a paz.',
    mission_p2:         'Nosso objetivo é demonstrar — em tempo real,\nnuma carta mundial viva — que a humanidade\nescolhe a paz. Não como um sonho.\nComo um ato diário.',
    how_lbl:            'Como Funciona',
    step1_title:        'Cadastrar',
    step1_desc:         'Entre uma vez. Compartilhe seu país, idade e gênero. Sem conta, senha ou email — sua privacidade está protegida.',
    step2_title:        'Escolher a Paz Todo Dia',
    step2_desc:         'Volte cada dia e pressione o botão. Sua voz é contada no mapa global. Cada clique é um compromisso real.',
    step3_title:        'Convidar Amigos',
    step3_desc:         'Receba um código pessoal único. Compartilhe pelo WhatsApp, Telegram, Instagram ou SMS. Cada amigo que entra expande o movimento.',
    step4_title:        'Ganhar Pombas',
    step4_desc:         'Seu impacto de paz cresce todos os dias. Ganhe uma Pomba por cada dia que você age, e outra por cada dia que um amigo convidado age.',
    dove_lbl:           'A Pomba',
    dove_score:         'Sua Pontuação de Paz',
    dove_desc:          'A Pomba é o símbolo de impacto da NAVA PEACE.\nEla recompensa a constância e inspira outros a participar.\nCada Pomba representa um ato real de paz —\no seu ou de alguém que você inspirou.',
    dove_per_day:       '+1 Pomba\nPor Dia\nQue Age',
    dove_per_friend:    '+1 Pomba\nPor Ação\nDe Um Amigo',
    principles_lbl:     'Nossos Princípios',
    p_anon_name:        'Anônimo',
    p_anon_text:        'Sem nome, sem email. Coletamos apenas seu país, idade e gênero para entender quem escolhe a paz.',
    p_univ_name:        'Universal',
    p_univ_text:        'Aberto a todo ser humano na Terra, de qualquer país, cultura e origem.',
    p_daily_name:       'Diário',
    p_daily_text:       'A paz não é um ato único. Voltar cada dia é o que torna o movimento real e poderoso.',
    p_free_name:        'Gratuito',
    p_free_text:        'Sempre gratuito. Sem assinaturas, sem anúncios. Isso é um movimento, não um produto.',
    p_trans_name:       'Transparente',
    p_trans_text:       'Todos os dados são públicos e visíveis no mapa mundial ao vivo. Sem números ocultos, sem manipulação.',
    cta_btn:            '🕊  Entrar no Mapa da Paz',
  },

  de: {
    tagline:            'HEUTE WÄHLT DIE MENSCHHEIT DEN FRIEDEN',
    nav_peace:          'FRIEDEN',
    nav_map:            'KARTE',
    nav_profile:        'PROFIL',
    nav_about:          'ÜBER UNS',
    lbl_country:        'Land',
    lbl_age:            'Alter',
    lbl_gender:         'Geschlecht',
    ph_country:         'Wähle dein Land',
    ph_age:             'Dein Alter eingeben',
    ph_gender:          'Auswählen',
    gender_male:        'Männlich',
    gender_female:      'Weiblich',
    gender_other:       'Andere',
    gender_pns:         'Keine Angabe',
    btn_join:           'DER FRIEDENSKARTE BEITRETEN',
    footer_note:        'SEI DER WANDEL, DEN DU IN DER WELT SEHEN MÖCHTEST',
    msg_for1:           'HEUTE, FÜR MICH,',
    msg_for2:           'FÜR DICH, FÜR UNS,',
    msg_want:           'ICH WILL FRIEDEN',
    msg_for3:           'AUF DER GANZEN WELT',
    done_thank:         'DANKE, FRIEDENSLIEBENDER',
    done_sub:           'DU HAST HEUTE FRIEDEN GEWÄHLT',
    done_timer_label:   'NÄCHSTE AKTION IN',
    cnt_today_lbl:      'HEUTE',
    cnt_total_lbl:      'AKTIONEN INSGESAMT',
    lbl_peace_lovers:   'FRIEDENSLIEBENDE',
    lbl_countries:      'VERTRETENE LÄNDER',
    lbl_today_map:      'GLOBALE AKTIONEN HEUTE',
    lbl_days:           'TAGE',
    lbl_since:          'SEIT DEM START',
    lbl_follow:         'FOLGE UNS',
    profile_tagline:    'GEMEINSCHAFTSPROFIL',
    section_profile:    'DEIN PROFIL',
    section_doves:      'MEINE TAUBEN',
    dove_total_lbl:     'TAUBEN GESAMT',
    dove_own_lbl:       'EIGENE\nAKTIONEN',
    dove_ref_lbl:       'TAUBEN\nEMPFEHLUNG',
    section_invite:     'FREUNDE EINLADEN',
    copy_btn:           'KOPIEREN',
    lbl_friends:        'FREUNDE',
    lbl_invited:        'EINGELADEN',
    lbl_doves:          'TAUBEN',
    lbl_from_actions:   'AUS IHREN AKTIONEN',
    section_age:        'ALTERSVERTEILUNG',
    section_gender:     'GESCHLECHTERVERTEILUNG',
    edit_btn:           'BEARBEITEN',
    cancel_btn:         'ABBRECHEN',
    save_btn:           'SPEICHERN',
    close_btn:          'SCHLIESSEN',
    copied_lbl:         '✓ KOPIERT',
    popup_my_doves:     'MEINE TAUBEN',
    popup_own_lbl:      'EIGENE AKTIONEN',
    popup_ref_lbl:      'EMPFEHLUNG',
    no_data_profile:    'ERST ABSTIMMEN UM PROFIL ZU SEHEN',
    lbl_country_badge:  'LAND',
    lbl_age_badge:      'ALTER',
    lbl_gender_badge:   'GESCHLECHT',
    lbl_days_badge:     'TAGE',
    lbl_edit_country:   'LAND (2-BUCHSTABEN-CODE)',
    lbl_select:         '— AUSWÄHLEN —',
    generating_link:    'LINK WIRD GENERIERT...',
    about_tagline:      'ÜBER DIE BEWEGUNG',
    mission_lbl:        'Unsere Mission',
    mission_p1:         'NAVA PEACE ist eine globale tägliche Bewegung.\nJeden Tag treffen Menschen aus allen Ländern\neine einfache Entscheidung:\n\nFrieden zu wählen.',
    mission_p2:         'Unser Ziel ist es zu zeigen — in Echtzeit,\nauf einer lebenden Weltkarte — dass die Menschheit\nFrieden wählt. Nicht als Traum.\nAls täglichen Akt.',
    how_lbl:            'Wie Es Funktioniert',
    step1_title:        'Registrieren',
    step1_desc:         'Tritt einmal bei. Teile dein Land, Alter und Geschlecht. Kein Konto, kein Passwort, keine E-Mail — deine Privatsphäre ist geschützt.',
    step2_title:        'Täglich Frieden Wählen',
    step2_desc:         'Kehre jeden Tag zurück und drücke den Knopf. Deine Stimme wird auf der globalen Karte gezählt. Jeder Klick ist ein echtes Engagement.',
    step3_title:        'Freunde Einladen',
    step3_desc:         'Erhalte einen einzigartigen persönlichen Code. Teile ihn über WhatsApp, Telegram, Instagram oder SMS. Jeder Freund, der beitritt, erweitert die Bewegung.',
    step4_title:        'Tauben Verdienen',
    step4_desc:         'Dein Friedenseinfluss wächst täglich. Verdiene eine Taube für jeden Tag, an dem du handelst, und eine weitere für jeden Tag, an dem ein eingeladener Freund handelt.',
    dove_lbl:           'Die Taube',
    dove_score:         'Dein Friedens-Score',
    dove_desc:          'Die Taube ist das Symbol für individuellen Einfluss bei NAVA PEACE.\nSie belohnt Beständigkeit und inspiriert andere beizutreten.\nJede Taube steht für einen echten Friedensakt —\ndeinen oder den von jemandem, den du inspiriert hast.',
    dove_per_day:       '+1 Taube\nPro Tag\nDen Du Handelst',
    dove_per_friend:    '+1 Taube\nPro Aktion\nEines Freundes',
    principles_lbl:     'Unsere Prinzipien',
    p_anon_name:        'Anonym',
    p_anon_text:        'Kein Name, keine E-Mail. Wir erfassen nur dein Land, Alter und Geschlecht, um zu verstehen, wer Frieden wählt.',
    p_univ_name:        'Universal',
    p_univ_text:        'Offen für jeden Menschen auf der Erde, aus jedem Land, jeder Kultur und jedem Hintergrund.',
    p_daily_name:       'Täglich',
    p_daily_text:       'Frieden ist kein einmaliger Akt. Täglich zurückzukehren macht die Bewegung real und mächtig.',
    p_free_name:        'Kostenlos',
    p_free_text:        'Immer kostenlos. Keine Abonnements, keine Werbung. Dies ist eine Bewegung, kein Produkt.',
    p_trans_name:       'Transparent',
    p_trans_text:       'Alle Daten sind öffentlich und auf der Live-Weltkarte sichtbar. Keine versteckten Zahlen, keine Manipulation.',
    cta_btn:            '🕊  Der Friedenskarte Beitreten',
  },

  ar: {
    tagline:            'اليوم تختار الإنسانية السلام',
    nav_peace:          'سلام',
    nav_map:            'خريطة',
    nav_profile:        'الملف',
    nav_about:          'حول',
    lbl_country:        'البلد',
    lbl_age:            'العمر',
    lbl_gender:         'الجنس',
    ph_country:         'اختر بلدك',
    ph_age:             'أدخل عمرك',
    ph_gender:          'اختر',
    gender_male:        'ذكر',
    gender_female:      'أنثى',
    gender_other:       'آخر',
    gender_pns:         'أفضل عدم الإفصاح',
    btn_join:           'انضم إلى خريطة السلام',
    footer_note:        'كن التغيير الذي تريد أن تراه في العالم',
    msg_for1:           'اليوم، من أجلي،',
    msg_for2:           'من أجلك، من أجلنا،',
    msg_want:           'أريد السلام',
    msg_for3:           'في كل أنحاء العالم',
    done_thank:         'شكراً، يا محب السلام',
    done_sub:           'لقد اخترت السلام اليوم',
    done_timer_label:   'الإجراء التالي في',
    cnt_today_lbl:      'اليوم',
    cnt_total_lbl:      'إجمالي الإجراءات',
    lbl_peace_lovers:   'محبو السلام',
    lbl_countries:      'الدول الممثلة',
    lbl_today_map:      'الإجراءات العالمية اليوم',
    lbl_days:           'أيام',
    lbl_since:          'منذ الإطلاق',
    lbl_follow:         'تابعونا',
    profile_tagline:    'الملف الشخصي',
    section_profile:    'ملفك الشخصي',
    section_doves:      'حماماتي',
    dove_total_lbl:     'إجمالي الحمامات',
    dove_own_lbl:       'أفعالي',
    dove_ref_lbl:       'حمامات الإحالة',
    section_invite:     'دعوة الأصدقاء',
    copy_btn:           'نسخ',
    lbl_friends:        'أصدقاء',
    lbl_invited:        'مدعوون',
    lbl_doves:          'حمامات',
    lbl_from_actions:   'من أفعالهم',
    section_age:        'توزيع الأعمار',
    section_gender:     'توزيع الجنس',
    edit_btn:           'تعديل',
    cancel_btn:         'إلغاء',
    save_btn:           'حفظ',
    close_btn:          'إغلاق',
    copied_lbl:         '✓ تم النسخ',
    popup_my_doves:     'حماماتي',
    popup_own_lbl:      'أفعالي',
    popup_ref_lbl:      'إحالة',
    no_data_profile:    'صوّت أولاً لرؤية ملفك',
    lbl_country_badge:  'البلد',
    lbl_age_badge:      'العمر',
    lbl_gender_badge:   'الجنس',
    lbl_days_badge:     'أيام',
    lbl_edit_country:   'البلد (رمز حرفين)',
    lbl_select:         '— اختر —',
    generating_link:    'جارٍ إنشاء الرابط...',
    about_tagline:      'حول الحركة',
    mission_lbl:        'مهمتنا',
    mission_p1:         'NAVA PEACE حركة يومية عالمية.\nكل يوم، يتخذ أشخاص من كل دولة\nالتزامًا بسيطًا:\n\nاختيار السلام.',
    mission_p2:         'هدفنا هو إثبات — في الوقت الفعلي،\nعلى خريطة عالمية حية — أن الإنسانية\nتختار السلام. ليس كحلم.\nبل كفعل يومي.',
    how_lbl:            'كيف يعمل',
    step1_title:        'التسجيل',
    step1_desc:         'انضم مرة واحدة. شارك بلدك وعمرك وجنسك. بدون حساب أو كلمة مرور أو بريد إلكتروني — خصوصيتك محمية.',
    step2_title:        'اختر السلام كل يوم',
    step2_desc:         'عد كل يوم واضغط الزر. صوتك يُحسب على الخريطة العالمية. كل نقرة هي التزام حقيقي.',
    step3_title:        'دعوة الأصدقاء',
    step3_desc:         'احصل على رمز دعوة شخصي فريد. شاركه عبر واتساب أو تيليغرام أو انستغرام أو رسائل SMS. كل صديق ينضم يوسّع الحركة.',
    step4_title:        'اكسب الحمامات',
    step4_desc:         'تأثيرك في السلام يتنامى كل يوم. اكسب حمامة عن كل يوم تتصرف فيه، وحمامة أخرى عن كل يوم يتصرف فيه صديق دعوته.',
    dove_lbl:           'الحمامة',
    dove_score:         'نقاط سلامك',
    dove_desc:          'الحمامة هي رمز التأثير الفردي في NAVA PEACE.\nتكافئ المثابرة وتلهم الآخرين للانضمام.\nكل حمامة تمثل فعل سلام حقيقي —\nفعلك أو فعل شخص ألهمته.',
    dove_per_day:       '+1 حمامة\nعن كل يوم\nتتصرف فيه',
    dove_per_friend:    '+1 حمامة\nعن كل فعل\nلصديق',
    principles_lbl:     'مبادئنا',
    p_anon_name:        'مجهول الهوية',
    p_anon_text:        'لا اسم، لا بريد إلكتروني. نجمع فقط بلدك وعمرك وجنسك لنفهم من يختار السلام.',
    p_univ_name:        'عالمي',
    p_univ_text:        'مفتوح لكل إنسان على وجه الأرض، من كل بلد وثقافة وخلفية.',
    p_daily_name:       'يومي',
    p_daily_text:       'السلام ليس فعلاً واحداً. العودة كل يوم هو ما يجعل الحركة حقيقية وقوية.',
    p_free_name:        'مجاني',
    p_free_text:        'مجاني دائماً. لا اشتراكات، لا إعلانات. هذه حركة، وليست منتجاً.',
    p_trans_name:       'شفاف',
    p_trans_text:       'جميع البيانات عامة ومرئية على الخريطة العالمية المباشرة. لا أرقام مخفية، لا تلاعب.',
    cta_btn:            '🕊  انضم إلى خريطة السلام',
  },

  zh: {
    tagline:            '今天，人类选择和平',
    nav_peace:          '和平',
    nav_map:            '地图',
    nav_profile:        '档案',
    nav_about:          '关于',
    lbl_country:        '国家',
    lbl_age:            '年龄',
    lbl_gender:         '性别',
    ph_country:         '选择您的国家',
    ph_age:             '输入您的年龄',
    ph_gender:          '选择',
    gender_male:        '男性',
    gender_female:      '女性',
    gender_other:       '其他',
    gender_pns:         '不愿透露',
    btn_join:           '加入和平地图',
    footer_note:        '成为你希望在世界上看到的改变',
    msg_for1:           '今天，为了我，',
    msg_for2:           '为了你，为了我们，',
    msg_want:           '我要和平',
    msg_for3:           '遍及全世界',
    done_thank:         '谢谢你，和平爱好者',
    done_sub:           '你今天选择了和平',
    done_timer_label:   '下次行动倒计时',
    cnt_today_lbl:      '今天',
    cnt_total_lbl:      '总行动次数',
    lbl_peace_lovers:   '和平爱好者',
    lbl_countries:      '代表国家',
    lbl_today_map:      '今日全球行动',
    lbl_days:           '天',
    lbl_since:          '自启动以来',
    lbl_follow:         '关注我们',
    profile_tagline:    '社区档案',
    section_profile:    '你的档案',
    section_doves:      '我的鸽子',
    dove_total_lbl:     '鸽子总数',
    dove_own_lbl:       '我的\n行动',
    dove_ref_lbl:       '推荐\n鸽子',
    section_invite:     '邀请朋友',
    copy_btn:           '复制',
    lbl_friends:        '朋友',
    lbl_invited:        '已邀请',
    lbl_doves:          '鸽子',
    lbl_from_actions:   '来自他们的行动',
    section_age:        '年龄分布',
    section_gender:     '性别分布',
    edit_btn:           '编辑',
    cancel_btn:         '取消',
    save_btn:           '保存',
    close_btn:          '关闭',
    copied_lbl:         '✓ 已复制',
    popup_my_doves:     '我的鸽子',
    popup_own_lbl:      '自己的行动',
    popup_ref_lbl:      '推荐',
    no_data_profile:    '先投票查看您的档案',
    lbl_country_badge:  '国家',
    lbl_age_badge:      '年龄',
    lbl_gender_badge:   '性别',
    lbl_days_badge:     '天',
    lbl_edit_country:   '国家（2位代码）',
    lbl_select:         '— 选择 —',
    generating_link:    '正在生成链接...',
    about_tagline:      '关于运动',
    mission_lbl:        '我们的使命',
    mission_p1:         'NAVA PEACE 是一个全球日常运动。\n每天，来自每个国家的人们\n做出一个简单的承诺：\n\n选择和平。',
    mission_p2:         '我们的目标是实时证明，\n通过一张活的世界地图——人类\n选择和平。不是作为梦想，\n而是作为日常行动。',
    how_lbl:            '如何运作',
    step1_title:        '注册',
    step1_desc:         '只需注册一次。分享您的国家、年龄和性别。无需账号、密码或电子邮件——您的隐私受到保护。',
    step2_title:        '每天选择和平',
    step2_desc:         '每天回来按下按钮。您的声音在全球地图上被计数。每次点击都是真实的承诺。',
    step3_title:        '邀请朋友',
    step3_desc:         '获得唯一的个人邀请码。通过WhatsApp、Telegram、Instagram或短信分享。每位加入的朋友都扩大了运动。',
    step4_title:        '赢得鸽子',
    step4_desc:         '您的和平影响力每天增长。每天行动赢得一只鸽子，邀请的朋友每天行动也为您赢得一只鸽子。',
    dove_lbl:           '鸽子',
    dove_score:         '您的和平分数',
    dove_desc:          '鸽子是NAVA PEACE个人影响力的象征。\n它奖励坚持并激励他人加入。\n每只鸽子代表一次真实的和平行动——\n您的或您激励的人的。',
    dove_per_day:       '+1只鸽子\n每天\n您行动',
    dove_per_friend:    '+1只鸽子\n朋友每次\n日常行动',
    principles_lbl:     '我们的原则',
    p_anon_name:        '匿名',
    p_anon_text:        '无需姓名或邮箱。我们只收集您的国家、年龄和性别，以了解谁选择了和平。',
    p_univ_name:        '普世',
    p_univ_text:        '向地球上每个人类开放，来自每个国家、文化和背景。',
    p_daily_name:       '每日',
    p_daily_text:       '和平不是一次性的行动。每天回来是使运动真实而强大的关键。',
    p_free_name:        '免费',
    p_free_text:        '永远免费。没有订阅，没有广告。这是一个运动，不是产品。',
    p_trans_name:       '透明',
    p_trans_text:       '所有数据公开，可在实时世界地图上看到。没有隐藏数字，没有操纵。',
    cta_btn:            '🕊  加入和平地图',
  },

  ru: {
    tagline:            'СЕГОДНЯ ЧЕЛОВЕЧЕСТВО ВЫБИРАЕТ МИР',
    nav_peace:          'МИР',
    nav_map:            'КАРТА',
    nav_profile:        'ПРОФИЛЬ',
    nav_about:          'О НАС',
    lbl_country:        'Страна',
    lbl_age:            'Возраст',
    lbl_gender:         'Пол',
    ph_country:         'Выберите страну',
    ph_age:             'Введите ваш возраст',
    ph_gender:          'Выбрать',
    gender_male:        'Мужской',
    gender_female:      'Женский',
    gender_other:       'Другой',
    gender_pns:         'Предпочитаю не говорить',
    btn_join:           'ПРИСОЕДИНИТЬСЯ К КАРТЕ МИРА',
    footer_note:        'БУДЬТЕ ПЕРЕМЕНАМИ, КОТОРЫЕ ВЫ ХОТИТЕ ВИДЕТЬ В МИРЕ',
    msg_for1:           'СЕГОДНЯ, ДЛЯ МЕНЯ,',
    msg_for2:           'ДЛЯ ТЕБЯ, ДЛЯ НАС,',
    msg_want:           'Я ХОЧУ МИР',
    msg_for3:           'ВО ВСЁМ МИРЕ',
    done_thank:         'СПАСИБО, ЛЮБИТЕЛЬ МИРА',
    done_sub:           'СЕГОДНЯ ВЫ ВЫБРАЛИ МИР',
    done_timer_label:   'СЛЕДУЮЩЕЕ ДЕЙСТВИЕ ЧЕРЕЗ',
    cnt_today_lbl:      'СЕГОДНЯ',
    cnt_total_lbl:      'ВСЕГО ДЕЙСТВИЙ',
    lbl_peace_lovers:   'ЛЮБИТЕЛИ МИРА',
    lbl_countries:      'ПРЕДСТАВЛЕННЫЕ СТРАНЫ',
    lbl_today_map:      'ГЛОБАЛЬНЫЕ ДЕЙСТВИЯ СЕГОДНЯ',
    lbl_days:           'ДНЕ',
    lbl_since:          'С МОМЕНТА ЗАПУСКА',
    lbl_follow:         'СЛЕДИТЕ ЗА НАМИ',
    profile_tagline:    'ПРОФИЛЬ СООБЩЕСТВА',
    section_profile:    'ВАШ ПРОФИЛЬ',
    section_doves:      'МОИ ГОЛУБИ',
    dove_total_lbl:     'ВСЕГО ГОЛУБЕЙ',
    dove_own_lbl:       'МОИ\nДЕЙСТВИЯ',
    dove_ref_lbl:       'ГОЛУБИ\nОТ ДРУЗЕЙ',
    section_invite:     'ПРИГЛАСИТЬ ДРУЗЕЙ',
    copy_btn:           'КОПИРОВАТЬ',
    lbl_friends:        'ДРУЗЬЯ',
    lbl_invited:        'ПРИГЛАШЕНЫ',
    lbl_doves:          'ГОЛУБИ',
    lbl_from_actions:   'ОТ ИХ ДЕЙСТВИЙ',
    section_age:        'РАСПРЕДЕЛЕНИЕ ПО ВОЗРАСТУ',
    section_gender:     'РАСПРЕДЕЛЕНИЕ ПО ПОЛУ',
    edit_btn:           'РЕДАКТИРОВАТЬ',
    cancel_btn:         'ОТМЕНА',
    save_btn:           'СОХРАНИТЬ',
    close_btn:          'ЗАКРЫТЬ',
    copied_lbl:         '✓ СКОПИРОВАНО',
    popup_my_doves:     'МОИ ГОЛУБИ',
    popup_own_lbl:      'МОИ ДЕЙСТВИЯ',
    popup_ref_lbl:      'РЕКОМЕНДАЦИЯ',
    no_data_profile:    'СНАЧАЛА ПРОГОЛОСУЙТЕ',
    lbl_country_badge:  'СТРАНА',
    lbl_age_badge:      'ВОЗРАСТ',
    lbl_gender_badge:   'ПОЛ',
    lbl_days_badge:     'ДНИ',
    lbl_edit_country:   'СТРАНА (2-БУКВЕННЫЙ КОД)',
    lbl_select:         '— ВЫБРАТЬ —',
    generating_link:    'ГЕНЕРАЦИЯ ССЫЛКИ...',
    about_tagline:      'О ДВИЖЕНИИ',
    mission_lbl:        'Наша Миссия',
    mission_p1:         'NAVA PEACE — ежедневное глобальное движение.\nКаждый день люди из всех стран\nберут на себя простое обязательство:\n\nВыбрать мир.',
    mission_p2:         'Наша цель — доказать в реальном времени,\nна живой карте мира — что человечество\nвыбирает мир. Не как мечту.\nКак ежедневный поступок.',
    how_lbl:            'Как Это Работает',
    step1_title:        'Зарегистрироваться',
    step1_desc:         'Присоединяйтесь один раз. Укажите страну, возраст и пол. Без аккаунта, пароля и email — ваша конфиденциальность защищена.',
    step2_title:        'Выбирать Мир Каждый День',
    step2_desc:         'Возвращайтесь каждый день и нажимайте кнопку. Ваш голос учитывается на глобальной карте. Каждый клик — настоящее обязательство.',
    step3_title:        'Пригласить Друзей',
    step3_desc:         'Получите уникальный личный код. Поделитесь им через WhatsApp, Telegram, Instagram или SMS. Каждый вступивший друг расширяет движение.',
    step4_title:        'Зарабатывать Голубей',
    step4_desc:         'Ваш вклад в мир растёт ежедневно. Получайте голубя за каждый день, когда вы действуете, и ещё одного за каждый день, когда действует приглашённый вами друг.',
    dove_lbl:           'Голубь',
    dove_score:         'Ваш Счёт Мира',
    dove_desc:          'Голубь — символ личного влияния NAVA PEACE.\nОн вознаграждает постоянство и вдохновляет других.\nКаждый голубь — реальный акт мира:\nваш или того, кого вы вдохновили.',
    dove_per_day:       '+1 Голубь\nЗа Каждый\nДень Действий',
    dove_per_friend:    '+1 Голубь\nЗа Действие\nДруга',
    principles_lbl:     'Наши Принципы',
    p_anon_name:        'Анонимно',
    p_anon_text:        'Без имени и email. Мы собираем только страну, возраст и пол, чтобы понять, кто выбирает мир.',
    p_univ_name:        'Универсально',
    p_univ_text:        'Открыто для каждого человека на Земле, из любой страны, культуры и происхождения.',
    p_daily_name:       'Ежедневно',
    p_daily_text:       'Мир — не разовый поступок. Возвращаться каждый день — вот что делает движение реальным и мощным.',
    p_free_name:        'Бесплатно',
    p_free_text:        'Всегда бесплатно. Без подписок и рекламы. Это движение, а не продукт.',
    p_trans_name:       'Прозрачно',
    p_trans_text:       'Все данные публичны и видны на живой карте мира. Никаких скрытых цифр, никаких манипуляций.',
    cta_btn:            '🕊  Присоединиться к Карте Мира',
  },

};

// ── Language detection & application ─────────────────────────────────

const LANG_META = {
  en: { label: 'EN', flag: '🇬🇧', dir: 'ltr' },
  fr: { label: 'FR', flag: '🇫🇷', dir: 'ltr' },
  es: { label: 'ES', flag: '🇪🇸', dir: 'ltr' },
  pt: { label: 'PT', flag: '🇧🇷', dir: 'ltr' },
  de: { label: 'DE', flag: '🇩🇪', dir: 'ltr' },
  ar: { label: 'AR', flag: '🇸🇦', dir: 'rtl' },
  zh: { label: 'ZH', flag: '🇨🇳', dir: 'ltr' },
  ru: { label: 'RU', flag: '🇷🇺', dir: 'ltr' },
};

function detectLang() {
  const stored = localStorage.getItem('nava_peace_lang');
  if (stored && NAVA_TRANSLATIONS[stored]) return stored;
  const browser = (navigator.language || 'en').split('-')[0].toLowerCase();
  return NAVA_TRANSLATIONS[browser] ? browser : 'en';
}

function t(key) {
  const lang = localStorage.getItem('nava_peace_lang') || 'en';
  const strings = NAVA_TRANSLATIONS[lang] || NAVA_TRANSLATIONS.en;
  return strings[key] !== undefined ? strings[key] : (NAVA_TRANSLATIONS.en[key] || key);
}

function applyLang(lang) {
  if (!NAVA_TRANSLATIONS[lang]) lang = 'en';
  localStorage.setItem('nava_peace_lang', lang);
  const meta = LANG_META[lang];

  // Direction (RTL for Arabic)
  document.documentElement.dir = meta.dir;
  document.documentElement.lang = lang;

  // Apply all data-i18n text nodes
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (val !== undefined) el.textContent = val;
  });

  // Apply innerHTML (for text with \n line breaks)
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    const val = t(key);
    if (val !== undefined) el.innerHTML = val.replace(/\n/g, '<br>');
  });

  // Apply placeholders
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.getAttribute('data-i18n-ph');
    const val = t(key);
    if (val !== undefined) el.placeholder = val;
  });

  // Update picker badge
  document.querySelectorAll('.lang-current-label').forEach(el => {
    el.textContent = meta.flag + ' ' + meta.label;
  });

  // Close menu if open
  closeLangMenu();
}

// ── Language picker widget ────────────────────────────────────────────

function toggleLangMenu() {
  const menu = document.getElementById('lang-menu');
  if (menu) menu.classList.toggle('open');
}

function closeLangMenu() {
  const menu = document.getElementById('lang-menu');
  if (menu) menu.classList.remove('open');
}

// Close when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('#lang-switcher')) closeLangMenu();
});

// ── Inject CSS for the picker (once) ─────────────────────────────────
(function injectLangCSS() {
  if (document.getElementById('lang-style')) return;
  const style = document.createElement('style');
  style.id = 'lang-style';
  style.textContent = `
    #lang-switcher {
      position: fixed;
      top: 14px;
      right: 14px;
      z-index: 500;
    }
    .lang-toggle-btn {
      background: rgba(255,255,255,0.18);
      border: 1px solid rgba(255,255,255,0.35);
      border-radius: 20px;
      color: #fff;
      font-family: 'Nasalization', Arial, sans-serif;
      font-size: 11px;
      letter-spacing: 1.5px;
      padding: 6px 13px;
      cursor: pointer;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      transition: background 0.2s;
      white-space: nowrap;
    }
    .lang-toggle-btn:hover { background: rgba(255,255,255,0.28); }
    #lang-menu {
      display: none;
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      background: rgba(20,80,140,0.92);
      border: 1px solid rgba(255,255,255,0.3);
      border-radius: 16px;
      padding: 8px;
      min-width: 140px;
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      box-shadow: 0 8px 32px rgba(10,40,100,0.45);
    }
    #lang-menu.open { display: block; }
    .lang-opt {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      background: none;
      border: none;
      border-radius: 10px;
      color: rgba(255,255,255,0.8);
      font-family: 'Nasalization', Arial, sans-serif;
      font-size: 11px;
      letter-spacing: 1.5px;
      padding: 8px 10px;
      cursor: pointer;
      text-align: left;
      transition: background 0.15s;
    }
    .lang-opt:hover { background: rgba(255,255,255,0.12); color: #fff; }
    .lang-opt.active { color: #fff; background: rgba(255,255,255,0.15); }
  `;
  document.head.appendChild(style);
})();

// ── Inject picker HTML & auto-apply language ──────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Inject the picker widget
  const switcher = document.createElement('div');
  switcher.id = 'lang-switcher';
  const currentLang = detectLang();
  const currentMeta = LANG_META[currentLang];

  switcher.innerHTML = `
    <button class="lang-toggle-btn" onclick="toggleLangMenu()">
      <span class="lang-current-label">${currentMeta.flag} ${currentMeta.label}</span>
    </button>
    <div id="lang-menu">
      ${Object.entries(LANG_META).map(([code, m]) => `
        <button class="lang-opt${code === currentLang ? ' active' : ''}" onclick="applyLang('${code}')">
          ${m.flag} ${m.label}
        </button>`).join('')}
    </div>
  `;
  document.body.appendChild(switcher);

  // Apply detected/stored language
  applyLang(currentLang);
});
