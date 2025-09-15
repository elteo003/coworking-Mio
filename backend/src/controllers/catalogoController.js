const pool = require('../db');

// ✅ Funzione per generare descrizioni dettagliate delle sedi
function getDetailedDescription(nomeSede, citta) {
  const descriptions = {
    'Milano': `Sede moderna e funzionale nel cuore di Milano, perfetta per professionisti e startup. Offre spazi flessibili, sale riunioni attrezzate e un ambiente di lavoro stimolante. Ideale per networking e collaborazione.`,
    'Roma': `Coworking elegante e professionale a Roma, con spazi luminosi e arredamento moderno. Ambiente perfetto per meeting importanti e lavoro produttivo. Servizi di alto livello per i nostri clienti.`,
    'default': `Sede di coworking moderna e ben attrezzata, progettata per offrire il massimo comfort e produttività. Spazi flessibili, servizi completi e un ambiente di lavoro professionale.`
  };
  
  return descriptions[citta] || descriptions.default;
}

exports.getSedi = async (req, res) => {
  const { citta } = req.query;
  const startTime = Date.now();

  try {

    let result;
    if (citta) {
      result = await pool.query('SELECT * FROM Sede WHERE citta = $1', [citta]);
    } else {
      result = await pool.query('SELECT * FROM Sede');
    }

    const duration = Date.now() - startTime;

    // ✅ Aggiungi foto di fallback e descrizioni dettagliate per ogni sede
    const sediConFoto = result.rows.map(sede => ({
      ...sede,
      descrizione: sede.descrizione || getDetailedDescription(sede.nome, sede.citta),
      location_photos: [
        {
          url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&h=800&fit=crop&auto=format',
          url: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200&h=800&fit=crop&auto=format',
          alt: sede.nome
        },
        {
          url: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200&h=800&fit=crop&auto=format',
          url: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1200&h=800&fit=crop&auto=format',
          url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&h=800&fit=crop&auto=format',
          alt: sede.nome
        },
        {
          url: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1200&h=800&fit=crop&auto=format',
          url: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200&h=800&fit=crop&auto=format',
          url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&h=800&fit=crop&auto=format',
          alt: sede.nome
        }
      ]
    }));

    res.json(sediConFoto);

  } catch (err) {
    const duration = Date.now() - startTime;
    console.error('❌ Errore getSedi:', {
      error: err.message,
      stack: err.stack,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      error: 'Errore server',
      details: err.message,
      duration: `${duration}ms`
    });
  }
};

exports.getSpazi = async (req, res) => {
  const { id_sede, tipologia } = req.query;
  const startTime = Date.now();

  try {

    let base = 'SELECT * FROM Spazio';
    let where = [];
    let params = [];

    if (id_sede) {
      params.push(id_sede);
      where.push(`id_sede = $${params.length}`);
    }
    if (tipologia) {
      params.push(tipologia);
      where.push(`tipologia = $${params.length}`);
    }

    if (where.length > 0) {
      base += ' WHERE ' + where.join(' AND ');
    }


    const result = await pool.query(base, params);

    const duration = Date.now() - startTime;

    // Aggiungi foto di fallback per ogni spazio
    const spaziConFoto = result.rows.map(spazio => ({
      ...spazio,
      space_photos: [
        {
          url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=200&fit=crop',
          alt: spazio.nome
        },
        {
          url: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=400&h=200&fit=crop',
          alt: spazio.nome
        }
      ]
    }));

    res.json(spaziConFoto);

  } catch (err) {
    const duration = Date.now() - startTime;
    console.error('❌ Errore getSpazi:', {
      error: err.message,
      stack: err.stack,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      error: 'Errore server',
      details: err.message,
      duration: `${duration}ms`
    });
  }
};

exports.getServizi = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Servizio');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
};

exports.getServiziSpazio = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT s.id_servizio, s.nome, s.descrizione
       FROM Servizio s
       JOIN Spazio_Servizio ss ON s.id_servizio = ss.id_servizio
       WHERE ss.id_spazio = $1`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Errore server' });
  }
};

// Test connessione database e performance
exports.testDatabaseConnection = async (req, res) => {
  const startTime = Date.now();

  try {

    // Test 1: Connessione base
    const connectionTest = await pool.query('SELECT NOW() as current_time');

    // Test 2: Query sedi
    const sediStart = Date.now();
    const sediResult = await pool.query('SELECT COUNT(*) as count FROM Sede');
    const sediDuration = Date.now() - sediStart;

    // Test 3: Query spazi
    const spaziStart = Date.now();
    const spaziResult = await pool.query('SELECT COUNT(*) as count FROM Spazio');
    const spaziDuration = Date.now() - spaziStart;

    const totalDuration = Date.now() - startTime;

    res.json({
      success: true,
      tests: {
        connection: 'OK',
        sedi: { count: sediResult.rows[0].count, duration: `${sediDuration}ms` },
        spazi: { count: spaziResult.rows[0].count, duration: `${spaziDuration}ms` }
      },
      totalDuration: `${totalDuration}ms`,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    const totalDuration = Date.now() - startTime;
    console.error('❌ Test database fallito:', {
      error: err.message,
      stack: err.stack,
      duration: `${totalDuration}ms`
    });

    res.status(500).json({
      success: false,
      error: err.message,
      duration: `${totalDuration}ms`
    });
  }
}; 
