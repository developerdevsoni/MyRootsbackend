const uploadMemberImage = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    // Construct full URL (assuming localhost for now, can be updated with environment variable)
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const imageUrl = `${baseUrl}/uploads/${req.file.filename}`;

    res.json({ imageUrl, filename: req.file.filename });
};

module.exports = { uploadMemberImage };
