const matchService = require('../services/match.service');

const getMyMatches = async (req, res) => {
    try {
        const matches = await matchService.getMyMatches(req.user.userId);
        res.json(matches);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getTreeMatches = async (req, res) => {
    try {
        const matches = await matchService.getTreeMatches(req.params.treeId);
        res.json(matches);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getMyMatches, getTreeMatches };
