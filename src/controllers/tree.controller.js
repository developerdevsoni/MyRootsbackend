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
        const treeStructure = await treeService.getFamilyTree(req.params.treeId);
        if (!treeStructure || treeStructure.nodes.length === 0) {
             // Fallback or specific check if tree exists but is empty? 
             // Logic in buildFamilyTree returns empty nodes array if no members found.
             // We might want to check if tree exists at all first, but service handles fetching.
        }
        res.json(treeStructure);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { create, listUserTrees, getDetails };
