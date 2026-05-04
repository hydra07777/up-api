const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4000;
const DOMAIN = process.env.DOMAIN || 'localhost:4000';

// Middleware
app.use(cors());
app.use(express.json());

// Créer le dossier uploads s'il n'existe pas
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuration du stockage avec Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        // Générer un nom unique avec timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

// Filtrer les fichiers (images et PDFs uniquement)
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/jpg',
        'application/pdf'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Type de fichier non autorisé. Seuls les images (JPEG, PNG, GIF, WEBP) et PDF sont acceptés.'), false);
    }
};

// Configuration de Multer
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // Limite de 10MB
    },
    fileFilter: fileFilter
});

// Servir les fichiers statiques
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Servir la page HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Route pour uploader un fichier
app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Aucun fichier téléchargé'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Fichier téléchargé avec succès',
            file: {
                filename: req.file.filename,
                originalName: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                url: `https://hydradomain.dpdns.org/uploads/${req.file.filename}`
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur lors du téléchargement',
            error: error.message
        });
    }
});

// Route pour uploader plusieurs fichiers
app.post('/api/upload/multiple', upload.array('files', 10), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Aucun fichier téléchargé'
            });
        }

        const filesInfo = req.files.map(file => ({
            filename: file.filename,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            url: `https://hydradomain.dpdns.org/uploads/${file.filename}`
        }));

        res.status(200).json({
            success: true,
            message: `${req.files.length} fichiers téléchargés avec succès`,
            files: filesInfo
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur lors du téléchargement',
            error: error.message
        });
    }
});

// Route pour lister les fichiers
app.get('/api/files', (req, res) => {
    try {
        const files = fs.readdirSync(uploadDir).map(filename => {
            const filepath = path.join(uploadDir, filename);
            const stats = fs.statSync(filepath);

            return {
                filename: filename,
                size: stats.size,
                createdAt: stats.birthtime,
                url: `https://hydradomain.dpdns.org/uploads/${filename}`
            };
        });

        res.status(200).json({
            success: true,
            files: files
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des fichiers',
            error: error.message
        });
    }
});

// Route pour supprimer un fichier
app.delete('/api/files/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const filepath = path.join(uploadDir, filename);

        if (!fs.existsSync(filepath)) {
            return res.status(404).json({
                success: false,
                message: 'Fichier non trouvé'
            });
        }

        fs.unlinkSync(filepath);

        res.status(200).json({
            success: true,
            message: 'Fichier supprimé avec succès'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression',
            error: error.message
        });
    }
});

// Gestion des erreurs Multer
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'Le fichier est trop volumineux. La limite est de 10MB.'
            });
        }
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }

    if (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }

    next();
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
    console.log(`📁 Dossier d'upload: ${uploadDir}`);
});
