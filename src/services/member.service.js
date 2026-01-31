const prisma = require('../config/prisma');
const matchService = require('./match.service');


const addMember = async (data) => {
    const {
        treeId,
        relatedMemberId,
        relationType,
        name,
        gender,
        birthDate,
        location,
        imageUrl,
        role
    } = data;

    const relatedMember = await prisma.familyMember.findUnique({
        where: { id: parseInt(relatedMemberId) },
        include: {
            parents: true
        }
    });

    if (!relatedMember) {
        throw new Error('Related member not found');
    }

    let generationLevel;

    // 🔹 Generation logic
    if (relationType === 'parent') {
        generationLevel = relatedMember.generationLevel - 1;
    } else if (relationType === 'child') {
        generationLevel = relatedMember.generationLevel + 1;
    } else if (relationType === 'spouse' || relationType === 'sibling') {
        generationLevel = relatedMember.generationLevel;
    } else {
        throw new Error('Invalid relation type');
    }

    // 1️⃣ Create new member
    const newMember = await prisma.familyMember.create({
        data: {
            treeId: parseInt(treeId),
            name,
            gender,
            birthDate: birthDate ? new Date(birthDate) : null,
            location,
            imageUrl,
            generationLevel
        }
    });

    // 2️⃣ Relationship handling
    if (relationType === 'parent') {
        const parentRole =
            role ||
            (gender === 'male'
                ? 'father'
                : gender === 'female'
                ? 'mother'
                : 'parent');

        await addParent(parseInt(relatedMemberId), newMember.id, parentRole);

    } else if (relationType === 'child') {
        const parentRole =
            relatedMember.gender === 'male'
                ? 'father'
                : relatedMember.gender === 'female'
                ? 'mother'
                : 'parent';

        await addParent(newMember.id, parseInt(relatedMemberId), parentRole);

    } else if (relationType === 'spouse') {
        await addSpouse(newMember.id, parseInt(relatedMemberId));

    } else if (relationType === 'sibling') {
        // 🚨 REAL sibling logic
        if (!relatedMember.parents.length) {
            throw new Error('Cannot add sibling: related member has no parents');
        }

        for (const parentLink of relatedMember.parents) {
            await addParent(
                newMember.id,
                parentLink.parentId,
                parentLink.role
            );
        }
    }

    // 3️⃣ Async index
    matchService.indexMember(newMember.id).catch(console.error);

    return newMember;
};


// --- Helper Services ---

const addParent = async (childId, parentId, role) => {
    // Validate Max 2 Parents
    const existingParents = await prisma.parentChild.findMany({
        where: { childId }
    });

    if (existingParents.length >= 2) {
        throw new Error('Child already has 2 parents');
    }

    // Validate Role (One father, one mother max) - Optional but good practice
    // If strict role validation is needed:
    const hasFather = existingParents.some(p => p.role === 'father');
    const hasMother = existingParents.some(p => p.role === 'mother');

    if (role === 'father' && hasFather) throw new Error('Child already has a father');
    if (role === 'mother' && hasMother) throw new Error('Child already has a mother');

    // Create Link
    await prisma.parentChild.create({
        data: {
            childId,
            parentId,
            role
        }
    });
};

const addSpouse = async (memberId1, memberId2) => {
    // Create Bidirectional Link (Stored as one unique pair per our schema unique constraint?)
    // Our schema has @@unique([memberId, relatedMemberId]).
    // To make querying easy, we typically store ONE record or TWO?
    // User Instructions: "Create ONE spouse relation".
    // "FamilyRelation must represent ONLY spouse/marriage"
    // But usually for "get spouses of X", we query where memberId=X OR relatedId=X.
    // Let's store sorted IDs to ensure uniqueness if we only want one record, 
    // OR we can rely on the service to check existence.
    // To keep it simple and consistent with previous "relationsFrom/relationsTo" usage (though we removed that),
    // let's just store one record. Low ID -> High ID.
    
    const [first, second] = [memberId1, memberId2].sort((a, b) => a - b);

    // Check if exists
    const existing = await prisma.familyRelation.findUnique({
        where: {
            memberId_relatedMemberId: {
                memberId: first,
                relatedMemberId: second
            }
        }
    });

    if (!existing) {
        await prisma.familyRelation.create({
            data: {
                memberId: first,
                relatedMemberId: second,
                relationType: 'spouse',
                startDate: new Date()
            }
        });
    }
};

const removeSpouse = async (memberId1, memberId2) => {
    const [first, second] = [memberId1, memberId2].sort((a, b) => a - b);
    
    // Soft Delete (Divorce) via endDate
    await prisma.familyRelation.update({
        where: {
            memberId_relatedMemberId: {
                memberId: first,
                relatedMemberId: second
            }
        },
        data: {
            endDate: new Date()
        }
    });
};

const getMember = async (memberId) => {
    return await prisma.familyMember.findUnique({
        where: { id: parseInt(memberId) },
        include: {
            parents: { include: { parent: true } },
            children: { include: { child: true } },
            spouseRelationsFrom: { include: { relatedMember: true } },
            spouseRelationsTo: { include: { member: true } }
        }
    });
};

const deleteMember = async (memberId) => {
    return await prisma.familyMember.delete({ where: { id: parseInt(memberId) } });
};

module.exports = { addMember, getMember, deleteMember, addParent, addSpouse, removeSpouse };
