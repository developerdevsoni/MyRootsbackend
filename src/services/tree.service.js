const prisma = require('../config/prisma');

const createTree = async (userId, data) => {
    const { title, rootName, rootGender, rootBirthDate, rootLocation } = data;

    // Transaction to ensure Tree and Root Member are created together
    return await prisma.$transaction(async (prisma) => {
        // 1. Create Tree
        const tree = await prisma.familyTree.create({
            data: {
                title,
                userId
            }
        });

        // 2. Create Root Member
        const rootMember = await prisma.familyMember.create({
            data: {
                treeId: tree.id,
                name: rootName,
                gender: rootGender,
                birthDate: rootBirthDate ? new Date(rootBirthDate) : null,
                location: rootLocation,
                generationLevel: 0
            }
        });

        // 3. Update Tree with rootMemberId
        const updatedTree = await prisma.familyTree.update({
            where: { id: tree.id },
            data: { rootMemberId: rootMember.id },
            include: { rootMember: true }
        });

        return updatedTree;
    });
};

const getUserTrees = async (userId) => {
    return await prisma.familyTree.findMany({
        where: { userId },
        include: { rootMember: true },
        orderBy: { createdAt: 'desc' }
    });
};

const getTreeDetails = async (treeId) => {
    return await prisma.familyTree.findUnique({
        where: { id: parseInt(treeId) },
        include: {
            members: {
                include: {
                    relationsFrom: true,
                    relationsTo: true
                }
            }
        }
    });
};

module.exports = { createTree, getUserTrees, getTreeDetails };
