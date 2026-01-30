const treeService = require('../services/tree.service');

const create = async (req, res) => {
    try {
        const tree = await treeService.createTree(req.user.userId, req.body);
        res.status(201).json(tree);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const listUserTrees = async (req, res) => {
    try {
        const trees = await treeService.getUserTrees(req.user.userId);
        res.json(trees);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getDetails = async (req, res) => {
    try {
        const tree = await treeService.getTreeDetails(req.params.treeId);
        if (!tree) return res.status(404).json({ message: 'Tree not found' });
        res.json(tree);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { create, listUserTrees, getDetails };
