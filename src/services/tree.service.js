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

const getFamilyTree = async (treeId) => {
    // 1. Fetch Members
    const members = await prisma.familyMember.findMany({
        where: { treeId: parseInt(treeId) }
    });
    const memberMap = new Map();
    members.forEach(m => memberMap.set(m.id, m));
    const memberIds = members.map(m => m.id);

    // 2. Fetch ParentChild Relationships (Source of Truth for Hierarchy)
    const parentChildRelations = await prisma.parentChild.findMany({
        where: {
            OR: [
                { childId: { in: memberIds } },
                { parentId: { in: memberIds } }
            ]
        }
    });

    // 3. Fetch Spouse Relationships (Horizontal)
    const spouseRelations = await prisma.familyRelation.findMany({
        where: {
            relationType: 'spouse',
            OR: [
                { memberId: { in: memberIds } },
                { relatedMemberId: { in: memberIds } }
            ],
            endDate: null // Active marriages only? Requirement says "Support endDate for divorce", usually tree shows all but maybe marks divorced.
            // Let's include all and let frontend handle or just include active. 
            // Requirement: "spouses" array. Usually includes current.
            // Let's just fetch all and maybe filter later if needed, but for now assuming all spouses.
        }
    });

    // 4. Build Graph Maps
    const childrenMap = new Map(); // parentId -> [childId]
    const parentMap = new Map();   // childId -> [parentId]
    const spouseMap = new Map();   // memberId -> [spouseId]

    parentChildRelations.forEach(pc => {
        // Child Map
        if (!childrenMap.has(pc.parentId)) childrenMap.set(pc.parentId, []);
        childrenMap.get(pc.parentId).push(pc.childId);

        // Parent Map
        if (!parentMap.has(pc.childId)) parentMap.set(pc.childId, []);
        parentMap.get(pc.childId).push({ id: pc.parentId, role: pc.role });
    });

    spouseRelations.forEach(rel => {
        const { memberId, relatedMemberId } = rel;
        // Add bidirectional
        if (!spouseMap.has(memberId)) spouseMap.set(memberId, []);
        spouseMap.get(memberId).push(relatedMemberId);

        if (!spouseMap.has(relatedMemberId)) spouseMap.set(relatedMemberId, []);
        spouseMap.get(relatedMemberId).push(memberId);
    });

    // 5. Identify Roots
    // Roots are members in this tree who have NO parents in this tree.
    const rootIds = members
        .map(m => m.id)
        .filter(id => !parentMap.has(id) || parentMap.get(id).length === 0);
    
    // Sort roots
    rootIds.sort((a, b) => {
        const mA = memberMap.get(a);
        const mB = memberMap.get(b);
        return (mA.birthDate || 0) - (mB.birthDate || 0) || mA.id - mB.id;
    });

    // 6. Recursive Builder
    const buildNode = (currentId, visitedPath = new Set(), currentGeneration = 0) => {
        if (visitedPath.has(currentId)) {
            console.warn(`Cycle detected for member ${currentId}`);
            return null;
        }

        const member = memberMap.get(currentId);
        if (!member) return null;

        const newVisited = new Set(visitedPath);
        newVisited.add(currentId);

        // Fetch Spouses
        const currentSpouseIds = spouseMap.get(currentId) || [];
        const spouses = currentSpouseIds.map(sId => {
            const s = memberMap.get(sId);
            return s ? {
                id: s.id,
                name: s.name,
                gender: s.gender,
                birthDate: s.birthDate,
                imageUrl: s.imageUrl
            } : null;
        }).filter(Boolean);

        // Fetch Children
        // Children are defined by ParentChild table where parentId = currentId
        const childIds = childrenMap.get(currentId) || [];
        
        // Sort children
        childIds.sort((a, b) => {
            const mA = memberMap.get(a);
            const mB = memberMap.get(b);
            return (mA.birthDate || 0) - (mB.birthDate || 0);
        });

        const childrenNodes = childIds
            .map(childId => buildNode(childId, newVisited, currentGeneration + 1))
            .filter(Boolean);

        return {
            id: member.id,
            name: member.name,
            gender: member.gender,
            birthDate: member.birthDate,
            deathDate: member.deathDate,
            location: member.location,
            imageUrl: member.imageUrl,
            generationLevel: currentGeneration, // Computed
            spouses: spouses,
            children: childrenNodes
        };
    };

    // 7. Build Tree
    const treeNodes = rootIds
        .map(rootId => buildNode(rootId))
        .filter(Boolean);

    return {
        treeId: parseInt(treeId),
        nodes: treeNodes
    };
};

module.exports = { createTree, getUserTrees, getTreeDetails, getFamilyTree };
