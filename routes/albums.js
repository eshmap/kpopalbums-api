import express from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

// Multer setup for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/images/'), // Save to `public/images` folder
    filename: (req, file, cb) => {
        const ext = file.originalname.split('.').pop();
        const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1000)}.${ext}`;
        cb(null, uniqueFilename);
    }
});
const upload = multer({ storage });

// Get all albums
router.get('/all', async (req, res) => {
    const albums = await prisma.album.findMany();
    res.json(albums);
});

// Get an album by ID
router.get('/get/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) return res.status(400).send('Invalid album id.');

    const album = await prisma.album.findUnique({ where: { id } });
    album ? res.json(album) : res.status(404).send('Album not found.');
});

// Add a new album
router.post('/create', upload.single('image'), async (req, res) => {
    const { albumName, artist } = req.body;
    const filename = req.file ? req.file.filename : null;

    try {
        // Create a new album record in the database
        const album = await prisma.album.create({
            data: { 
                albumName, 
                artist, 
                filename, // Optional field
                year: req.body.year || null, // Optional field
                country: req.body.country || null, // Optional field
                embed: req.body.embed || null, // Optional field
            }
        });

        // Send the created album back in the response
        res.json(album);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Update an album by ID
router.put('/update/:id', upload.single('image'), async (req, res) => {
    const id = parseInt(req.params.id);
    const { albumName, artist, year, country, embed } = req.body;
    const updatedData = {};
    const newFilename = req.file ? req.file.filename : null;

    if (!albumName && !artist && !req.file) return res.status(400).json({ message: 'No fields to update' });
    
    if (albumName) updatedData.albumName = albumName;
    if (artist) updatedData.artist = artist;
    if (year) updatedData.year = year;
    if (country) updatedData.country = country;
    if (embed) updatedData.embed = embed;

    if (newFilename) {
        updatedData.filename = req.file.filename;
        const album = await prisma.album.findUnique({ where: { id } });
    
        if (!album) return res.status(404).json({ message: 'Album not found' });
    
        // Check if the album has a filename before trying to delete the old image
        if (album.filename) {
            const oldImagePath = path.join('public/images', album.filename);
            fs.promises.unlink(oldImagePath)
                .catch(err => console.error(`Failed to delete old image: ${err.message}`));
        }
    }

    const updatedAlbum = await prisma.album.update({
        where: { id },
        data: updatedData
    });

    res.status(200).json({ message: 'Album updated successfully', data: updatedAlbum });
});

// Delete an album by ID
router.delete('/delete/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const album = await prisma.album.findUnique({ where: { id } });

    if (!album) return res.status(404).json({ message: 'Album not found' });

    if (album.filename) {
        const oldImagePath = path.join('public/images', album.filename);
        fs.promises.unlink(oldImagePath)
            .catch(err => console.error(`Failed to delete old image: ${err.message}`));
    }

    const deletedAlbum = await prisma.album.delete({ where: { id } });

    res.status(200).json({ message: 'Album deleted successfully', data: deletedAlbum });
});

export default router;