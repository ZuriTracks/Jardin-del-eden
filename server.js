require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const fileUpload = require('express-fileupload');
const bodyParser = require('body-parser');

const app = express();

// Configurar body-parser antes que cualquier otro middleware
app.use(bodyParser.json({
    limit: '500mb',
    extended: true,
    parameterLimit: 500000
}));

app.use(bodyParser.urlencoded({
    limit: '500mb',
    extended: true,
    parameterLimit: 500000
}));

// Deshabilitar el límite de tamaño en express
app.use(express.json({
    limit: false
}));

app.use(express.urlencoded({
    limit: false,
    extended: true
}));

// Middleware para logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Configuración de CORS
app.use(cors({
    origin: true, // Permite cualquier origen en desarrollo
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization']
}));

// Middleware para parsear JSON y form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

// Servir archivos estáticos
app.use(express.static(path.join(__dirname)));
app.use('/avatars', express.static(path.join(__dirname, 'public', 'avatars')));

// Ruta para servir el index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Ruta para servir otros archivos HTML
app.get('/:page.html', (req, res) => {
    res.sendFile(path.join(__dirname, req.params.page + '.html'));
});

// Configuración de sesión
app.use(session({
    secret: 'jardin-del-eden-secret-key',
    resave: false,
    saveUninitialized: false,
    name: 'sessionId',
    cookie: { 
        secure: false, // cambiar a true si usas HTTPS
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
        httpOnly: true,
        sameSite: 'lax',
        path: '/'
    }
}));

// Middleware para logging de sesión
app.use((req, res, next) => {
    console.log('Session ID:', req.sessionID);
    console.log('Session Data:', req.session);
    next();
});

// Middleware para extender la sesión
app.use((req, res, next) => {
    if (req.session && req.session.user) {
        // Renovar la sesión si el usuario está autenticado
        req.session.touch();
    }
    next();
});

// Middleware para extender la sesión
app.use((req, res, next) => {
    if (req.session && req.session.user) {
        // Actualizar última conexión
        pool.query(
            'UPDATE "Usuarios" SET "Ultima_coneccion" = CURRENT_TIMESTAMP WHERE "ID" = $1',
            [req.session.user.id]
        ).catch(console.error);
    }
    next();
});

// Database configuration
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Monster2005@',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'JardinDelEden'
});

// Test database connection and create table if needed
async function initializeDatabase() {
    try {
        const client = await pool.connect();
        
        // Create the users table if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS "Usuarios" (
                "ID" SERIAL PRIMARY KEY,
                "Nombre_Usuario" VARCHAR(50) UNIQUE NOT NULL,
                "Email" VARCHAR(100) UNIQUE NOT NULL,
                "Contraseña" VARCHAR(255) NOT NULL,
                "Fecha_Registro" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "Biografia" TEXT,
                "Avatar_url" VARCHAR(255),
                "Es_admin" BOOLEAN DEFAULT FALSE,
                "Ultima_coneccion" TIMESTAMP,
                "Estado" VARCHAR(20) DEFAULT 'activo',
                "EdeCoins" INTEGER DEFAULT 0
            )
        `);

        // Create Followers table if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS "Seguidores" (
                "ID" SERIAL PRIMARY KEY,
                "Seguidor_ID" INTEGER REFERENCES "Usuarios"("ID") ON DELETE CASCADE,
                "Seguido_ID" INTEGER REFERENCES "Usuarios"("ID") ON DELETE CASCADE,
                "Fecha_Seguimiento" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE("Seguidor_ID", "Seguido_ID")
            )
        `);

        // Create Posts table if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS "Publicaciones" (
                "ID" SERIAL PRIMARY KEY,
                "Usuario_ID" INTEGER REFERENCES "Usuarios"("ID") ON DELETE CASCADE,
                "Contenido" TEXT NOT NULL,
                "Fecha_Publicacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "Likes" INTEGER DEFAULT 0,
                "Imagen_url" VARCHAR(255)
            )
        `);

        // Create Comments table if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS "Comentarios" (
                "ID" SERIAL PRIMARY KEY,
                "Usuario_ID" INTEGER REFERENCES "Usuarios"("ID") ON DELETE CASCADE,
                "Publicacion_ID" INTEGER REFERENCES "Publicaciones"("ID") ON DELETE CASCADE,
                "Contenido" TEXT NOT NULL,
                "Fecha_Comentario" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "Likes" INTEGER DEFAULT 0
            )
        `);

        // Create Tags table if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS "Etiquetas" (
                "ID" SERIAL PRIMARY KEY,
                "Nombre" VARCHAR(50) UNIQUE NOT NULL,
                "Descripcion" TEXT
            )
        `);

        // Create User-Tags relationship table if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS "UsuarioEtiquetas" (
                "Usuario_ID" INTEGER REFERENCES "Usuarios"("ID") ON DELETE CASCADE,
                "Etiqueta_ID" INTEGER REFERENCES "Etiquetas"("ID") ON DELETE CASCADE,
                "Fecha_Asignacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY ("Usuario_ID", "Etiqueta_ID")
            )
        `);

        // Create Achievements table if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS "Trofeos" (
                "ID" SERIAL PRIMARY KEY,
                "Nombre" VARCHAR(100) NOT NULL,
                "Descripcion" TEXT,
                "Imagen_url" VARCHAR(255),
                "Requisitos" TEXT
            )
        `);

        // Create User-Achievements relationship table if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS "UsuarioTrofeos" (
                "Usuario_ID" INTEGER REFERENCES "Usuarios"("ID") ON DELETE CASCADE,
                "Trofeo_ID" INTEGER REFERENCES "Trofeos"("ID") ON DELETE CASCADE,
                "Fecha_Obtencion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY ("Usuario_ID", "Trofeo_ID")
            )
        `);

        // Create Messages table if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS "Mensajes" (
                "ID" SERIAL PRIMARY KEY,
                "Emisor_ID" INTEGER REFERENCES "Usuarios"("ID") ON DELETE CASCADE,
                "Receptor_ID" INTEGER REFERENCES "Usuarios"("ID") ON DELETE CASCADE,
                "Contenido" TEXT NOT NULL,
                "Fecha_Envio" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "Leido" BOOLEAN DEFAULT FALSE
            )
        `);

        console.log('Base de datos inicializada correctamente');
        
        // Log table structure
        const tableInfo = await client.query(`
            SELECT column_name, data_type, character_maximum_length
            FROM information_schema.columns
            WHERE table_name = 'Usuarios'
            ORDER BY ordinal_position;
        `);
        console.log('\nEstructura de la tabla:');
        console.log(tableInfo.rows);

        client.release();
    } catch (error) {
        console.error('Error inicializando la base de datos:', error);
        throw error;
    }
}

// Initialize database when server starts
initializeDatabase().catch(console.error);

// Endpoint de registro
app.post('/api/registro', async (req, res) => {
    const { nombre: username, email, password } = req.body;

    try {
        console.log('=== INTENTO DE REGISTRO ===');
        console.log('Datos recibidos:', { username, email });
        console.log('Body completo:', req.body);

        // Validar longitud del nombre de usuario
        if (username.length > 50) {
            console.log('Error: nombre de usuario demasiado largo');
            return res.status(400).json({ 
                error: 'El nombre de usuario no puede tener más de 50 caracteres' 
            });
        }

        // Encriptar la contraseña
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        console.log('Contraseña encriptada correctamente');
        console.log('Intentando insertar usuario en la base de datos...');

        // Query de inserción
        const insertQuery = `
            INSERT INTO "Usuarios" (
                "Nombre_Usuario", 
                "Email", 
                "Contraseña",
                "Fecha_Registro",
                "Biografia",
                "Avatar_url",
                "Es_admin",
                "Ultima_coneccion",
                "Estado",
                "EdeCoins"
            ) 
            VALUES (
                $1, $2, $3, 
                CURRENT_TIMESTAMP,
                NULL,
                NULL,
                FALSE,
                CURRENT_TIMESTAMP,
                'activo',
                0
            ) 
            RETURNING "ID"
        `;

        console.log('Ejecutando query de inserción...');
        const result = await pool.query(insertQuery, [username, email, hashedPassword]);
        console.log('Usuario registrado exitosamente:', result.rows[0]);

        res.status(201).json({ 
            message: 'Usuario registrado exitosamente',
            userId: result.rows[0].ID 
        });
    } catch (error) {
        console.error('=== ERROR DE REGISTRO ===');
        console.error('Query fallida para usuario:', username);
        console.error('Email intentado:', email);
        console.error('Mensaje de error:', error.message);
        console.error('Detalles del error:', error.detail);
        console.error('Código de error:', error.code);
        console.error('Stack completo:', error.stack);
        console.error('========================');
        
        // Mensajes de error más específicos
        if (error.code === '23505') { // Error de duplicado
            if (error.detail && error.detail.includes('Nombre_Usuario')) {
                return res.status(400).json({ 
                    error: 'Este nombre de usuario ya está en uso' 
                });
            }
            if (error.detail && error.detail.includes('Email')) {
                return res.status(400).json({ 
                    error: 'Este correo electrónico ya está registrado' 
                });
            }
        }
        
        res.status(500).json({ 
            error: 'Error al registrar el usuario. Por favor, intenta de nuevo.',
            details: error.message,
            code: error.code
        });
    }
});

// Endpoint de inicio de sesión
app.post('/api/login', async (req, res) => {
    const { username, password, rememberMe } = req.body;
    console.log('Login attempt:', { username, rememberMe });

    try {
        // Buscar usuario en la base de datos
        const result = await pool.query(
            'SELECT * FROM "Usuarios" WHERE "Nombre_Usuario" = $1',
            [username]
        );

        if (result.rows.length === 0) {
            console.log('Usuario no encontrado:', username);
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.Contraseña);

        if (!validPassword) {
            console.log('Contraseña incorrecta para usuario:', username);
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        // Configurar la duración de la sesión
        const sessionDuration = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
        req.session.cookie.maxAge = sessionDuration;

        // Guardar información del usuario en la sesión
        req.session.user = {
            id: user.ID,
            username: user.Nombre_Usuario,
            email: user.Email,
            es_admin: user.Es_admin,
            avatar_url: user.Avatar_url
        };

        // Forzar guardado de sesión
        req.session.save(async (err) => {
            if (err) {
                console.error('Error guardando sesión:', err);
                return res.status(500).json({ error: 'Error al guardar la sesión' });
            }

            try {
                // Actualizar última conexión
                await pool.query(
                    'UPDATE "Usuarios" SET "Ultima_coneccion" = CURRENT_TIMESTAMP WHERE "ID" = $1',
                    [user.ID]
                );

                console.log('Login exitoso para usuario:', username);
                console.log('Session ID after login:', req.sessionID);
                console.log('Session data after login:', req.session);

                // Enviar respuesta con información del usuario y cookie de sesión
                res.json({ 
                    message: 'Inicio de sesión exitoso',
                    user: {
                        id: user.ID,
                        username: user.Nombre_Usuario,
                        email: user.Email,
                        es_admin: user.Es_admin,
                        avatar_url: user.Avatar_url
                    }
                });
            } catch (error) {
                console.error('Error actualizando última conexión:', error);
                // Aún enviamos respuesta exitosa ya que el login funcionó
                res.json({ 
                    message: 'Inicio de sesión exitoso',
                    user: req.session.user
                });
            }
        });
    } catch (error) {
        console.error('Error en el proceso de login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Endpoint para verificar sesión
app.get('/api/session', (req, res) => {
    console.log('Verificando sesión:', {
        sessionID: req.sessionID,
        session: req.session,
        user: req.session.user
    });

    if (req.session && req.session.user) {
        res.json({ 
            authenticated: true,
            user: req.session.user
        });
    } else {
        res.json({ 
            authenticated: false,
            user: null
        });
    }
});

// Endpoint para cerrar sesión
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error al cerrar sesión:', err);
            return res.status(500).json({ error: 'Error al cerrar sesión' });
        }
        res.clearCookie('sessionId');
        res.json({ message: 'Sesión cerrada exitosamente' });
    });
});

// Ruta de prueba para verificar el servidor
app.get('/api/test', (req, res) => {
    try {
        res.json({ 
            status: 'ok', 
            message: 'Servidor funcionando correctamente',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error en ruta de prueba:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Ejemplo de ruta para obtener datos
app.get('/api/test', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Get user profile
app.get('/api/user/:id', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                u."ID", 
                u."Nombre_Usuario" as username,
                u."Email" as email,
                u."Fecha_Registro" as fecha_registro,
                u."Biografia" as biografia,
                u."Avatar_url" as avatar_url,
                u."Es_admin" as es_admin,
                u."Estado" as estado,
                u."EdeCoins" as edecoins,
                COUNT(DISTINCT p."ID") as post_count,
                COUNT(DISTINCT c."ID") as comment_count,
                COUNT(DISTINCT s1."ID") as followers_count,
                COUNT(DISTINCT s2."ID") as following_count
            FROM "Usuarios" u
            LEFT JOIN "Publicaciones" p ON p."Usuario_ID" = u."ID"
            LEFT JOIN "Comentarios" c ON c."Usuario_ID" = u."ID"
            LEFT JOIN "Seguidores" s1 ON s1."Seguido_ID" = u."ID"
            LEFT JOIN "Seguidores" s2 ON s2."Seguidor_ID" = u."ID"
            WHERE u."ID" = $1
            GROUP BY u."ID"
        `, [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error getting user profile:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Get user posts
app.get('/api/user/:id/posts', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                p.*,
                u."Nombre_Usuario" as author,
                COUNT(DISTINCT c."ID") as comment_count,
                COALESCE(SUM(CASE WHEN c."Usuario_ID" = $1 THEN 1 ELSE 0 END), 0) as user_commented
            FROM "Publicaciones" p
            JOIN "Usuarios" u ON p."Usuario_ID" = u."ID"
            LEFT JOIN "Comentarios" c ON c."Publicacion_ID" = p."ID"
            WHERE p."Usuario_ID" = $1
            GROUP BY p."ID", u."Nombre_Usuario"
            ORDER BY p."Fecha_Publicacion" DESC
        `, [req.params.id]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error getting user posts:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Get user comments
app.get('/api/user/:id/comments', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                c.*,
                p."Contenido" as post_content,
                u."Nombre_Usuario" as author
            FROM "Comentarios" c
            JOIN "Publicaciones" p ON c."Publicacion_ID" = p."ID"
            JOIN "Usuarios" u ON c."Usuario_ID" = u."ID"
            WHERE c."Usuario_ID" = $1
            ORDER BY c."Fecha_Comentario" DESC
        `, [req.params.id]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error getting user comments:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Get user tags
app.get('/api/user/:id/tags', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT e.*
            FROM "Etiquetas" e
            JOIN "UsuarioEtiquetas" ue ON e."ID" = ue."Etiqueta_ID"
            WHERE ue."Usuario_ID" = $1
        `, [req.params.id]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error getting user tags:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Get user achievements
app.get('/api/user/:id/achievements', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT t.*
            FROM "Trofeos" t
            JOIN "UsuarioTrofeos" ut ON t."ID" = ut."Trofeo_ID"
            WHERE ut."Usuario_ID" = $1
        `, [req.params.id]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error getting user achievements:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Follow/Unfollow user
app.post('/api/follow/:id', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    try {
        // Check if already following
        const checkResult = await pool.query(
            'SELECT * FROM "Seguidores" WHERE "Seguidor_ID" = $1 AND "Seguido_ID" = $2',
            [req.session.user.id, req.params.id]
        );

        if (checkResult.rows.length > 0) {
            // Unfollow
            await pool.query(
                'DELETE FROM "Seguidores" WHERE "Seguidor_ID" = $1 AND "Seguido_ID" = $2',
                [req.session.user.id, req.params.id]
            );
            res.json({ isFollowing: false, message: 'Usuario dejado de seguir' });
        } else {
            // Follow
            await pool.query(
                'INSERT INTO "Seguidores" ("Seguidor_ID", "Seguido_ID") VALUES ($1, $2)',
                [req.session.user.id, req.params.id]
            );
            res.json({ isFollowing: true, message: 'Usuario seguido' });
        }
    } catch (error) {
        console.error('Error following/unfollowing user:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Check follow status
app.get('/api/follow/status/:id', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    try {
        const result = await pool.query(
            'SELECT * FROM "Seguidores" WHERE "Seguidor_ID" = $1 AND "Seguido_ID" = $2',
            [req.session.user.id, req.params.id]
        );
        
        res.json({ isFollowing: result.rows.length > 0 });
    } catch (error) {
        console.error('Error checking follow status:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Send message
app.post('/api/messages', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    const { receptor_id, contenido } = req.body;

    try {
        await pool.query(
            'INSERT INTO "Mensajes" ("Emisor_ID", "Receptor_ID", "Contenido") VALUES ($1, $2, $3)',
            [req.session.user.id, receptor_id, contenido]
        );
        res.json({ message: 'Mensaje enviado' });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Get followers
app.get('/api/user/:id/followers', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u."ID", u."Nombre_Usuario", u."Avatar_url"
            FROM "Usuarios" u
            JOIN "Seguidores" s ON u."ID" = s."Seguidor_ID"
            WHERE s."Seguido_ID" = $1
        `, [req.params.id]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error getting followers:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Get following
app.get('/api/user/:id/following', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u."ID", u."Nombre_Usuario", u."Avatar_url"
            FROM "Usuarios" u
            JOIN "Seguidores" s ON u."ID" = s."Seguido_ID"
            WHERE s."Seguidor_ID" = $1
        `, [req.params.id]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error getting following:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Update user profile
app.post('/api/user/update', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    const { username, email, bio, currentPassword, newPassword, confirmPassword } = req.body;

    try {
        // Verificar contraseña actual si se intenta cambiar
        if (newPassword) {
            const user = await pool.query('SELECT "Contraseña" FROM "Usuarios" WHERE "ID" = $1', [req.session.user.id]);
            const validPassword = await bcrypt.compare(currentPassword, user.rows[0].Contraseña);
            
            if (!validPassword) {
                return res.status(400).json({ error: 'Contraseña actual incorrecta' });
            }

            if (newPassword !== confirmPassword) {
                return res.status(400).json({ error: 'Las contraseñas nuevas no coinciden' });
            }
        }

        // Construir query dinámicamente
        let updateFields = [];
        let values = [];
        let paramCount = 1;

        if (username) {
            updateFields.push(`"Nombre_Usuario" = $${paramCount}`);
            values.push(username);
            paramCount++;
        }

        if (email) {
            updateFields.push(`"Email" = $${paramCount}`);
            values.push(email);
            paramCount++;
        }

        if (bio !== undefined) {
            updateFields.push(`"Biografia" = $${paramCount}`);
            values.push(bio);
            paramCount++;
        }

        if (newPassword) {
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            updateFields.push(`"Contraseña" = $${paramCount}`);
            values.push(hashedPassword);
            paramCount++;
        }

        values.push(req.session.user.id);
        const updateQuery = `
            UPDATE "Usuarios" 
            SET ${updateFields.join(', ')}
            WHERE "ID" = $${paramCount}
            RETURNING "ID", "Nombre_Usuario", "Email", "Biografia"
        `;

        const result = await pool.query(updateQuery, values);
        
        // Actualizar sesión
        req.session.user = {
            ...req.session.user,
            username: result.rows[0].Nombre_Usuario,
            email: result.rows[0].Email
        };

        res.json({ 
            message: 'Perfil actualizado exitosamente',
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        if (error.code === '23505') {
            if (error.detail.includes('Nombre_Usuario')) {
                return res.status(400).json({ error: 'Este nombre de usuario ya está en uso' });
            }
            if (error.detail.includes('Email')) {
                return res.status(400).json({ error: 'Este correo electrónico ya está registrado' });
            }
        }
        res.status(500).json({ error: 'Error al actualizar el perfil' });
    }
});

// Update user avatar
app.post('/api/user/avatar', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    if (!req.files || !req.files.avatar) {
        return res.status(400).json({ error: 'No se ha proporcionado ninguna imagen' });
    }

    try {
        const avatar = req.files.avatar;
        const fileName = `avatar_${req.session.user.id}_${Date.now()}${path.extname(avatar.name)}`;
        const uploadPath = path.join(__dirname, 'public', 'avatars', fileName);

        // Crear directorio si no existe
        await fs.promises.mkdir(path.join(__dirname, 'public', 'avatars'), { recursive: true });

        // Mover archivo
        await avatar.mv(uploadPath);

        // Actualizar base de datos
        await pool.query(
            'UPDATE "Usuarios" SET "Avatar_url" = $1 WHERE "ID" = $2',
            [`/avatars/${fileName}`, req.session.user.id]
        );

        res.json({ 
            message: 'Avatar actualizado exitosamente',
            avatar_url: `/avatars/${fileName}`
        });
    } catch (error) {
        console.error('Error updating avatar:', error);
        res.status(500).json({ error: 'Error al actualizar el avatar' });
    }
});

// Delete user account
app.delete('/api/user/delete', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    try {
        await pool.query('DELETE FROM "Usuarios" WHERE "ID" = $1', [req.session.user.id]);
        req.session.destroy();
        res.json({ message: 'Cuenta eliminada exitosamente' });
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({ error: 'Error al eliminar la cuenta' });
    }
});

// Crear publicación
app.post('/api/publicaciones', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    const { titulo, contenido, seccion, imagen_url } = req.body;
    if (!titulo || !contenido || !seccion) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }
    try {
        // Determinar la recompensa
        let recompensa = 100;
        if (contenido && /<video/i.test(contenido)) {
            recompensa = 200;
        } else if (contenido && /<img/i.test(contenido)) {
            recompensa = 150;
        }
        // Crear la publicación
        const result = await pool.query(
            'INSERT INTO "Publicaciones" ("Usuario_ID", "Titulo", "Contenido", "Seccion", "Fecha_Publicacion", "Imagen_url") VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5) RETURNING "ID", "Fecha_Publicacion"',
            [req.session.user.id, titulo, contenido, seccion, imagen_url || null]
        );
        // Sumar EdeCoins al usuario
        await pool.query(
            'UPDATE "Usuarios" SET "EdeCoins" = COALESCE("EdeCoins",0) + $1 WHERE "ID" = $2',
            [recompensa, req.session.user.id]
        );
        res.status(201).json({
            id: result.rows[0].ID,
            fecha: result.rows[0].Fecha_Publicacion
        });
    } catch (error) {
        console.error('Error creando publicación:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message,
            stack: error.stack
        });
    }
});

// Obtener publicación por ID (con datos del autor)
app.get('/api/publicaciones/:id', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p."ID", p."Contenido", p."Fecha_Publicacion", p."Imagen_url", p."Usuario_ID", 
                   u."Nombre_Usuario" as username, u."Avatar_url" as avatar_url, u."Fecha_Registro" as fecha_registro, u."EdeCoins" as edecoins
            FROM "Publicaciones" p
            JOIN "Usuarios" u ON p."Usuario_ID" = u."ID"
            WHERE p."ID" = $1
        `, [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Publicación no encontrada' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error obteniendo publicación:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener todas las publicaciones con datos del autor
app.get('/api/publicaciones', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p."ID" as id, p."Contenido" as contenido, p."Fecha_Publicacion" as fecha_publicacion, p."Imagen_url" as imagen_url, p."Usuario_ID", p."Titulo" as titulo, p."Seccion" as seccion,
                   u."Nombre_Usuario" as username, u."Avatar_url" as avatar_url, u."Fecha_Registro" as fecha_registro, u."EdeCoins" as edecoins
            FROM "Publicaciones" p
            JOIN "Usuarios" u ON p."Usuario_ID" = u."ID"
            ORDER BY p."Fecha_Publicacion" DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo publicaciones:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
}); 