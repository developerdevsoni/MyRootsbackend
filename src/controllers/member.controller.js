const memberService = require('../services/member.service');

const add = async (req, res) => {
    try {
        const member = await memberService.addMember(req.body);
        res.status(201).json(member);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const get = async (req, res) => {
    try {
        const member = await memberService.getMember(req.params.memberId);
        if (!member) return res.status(404).json({ message: 'Member not found' });
        res.json(member);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const remove = async (req, res) => {
    try {
        await memberService.deleteMember(req.params.memberId);
        res.json({ message: 'Member deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { add, get, remove };
