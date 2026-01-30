const prisma = require('../config/prisma');
const matchService = require('./match.service');

const addMember = async (data) => {
    const { treeId, relatedMemberId, relationType, name, gender, birthDate, location, imageUrl } = data;

    const relatedMember = await prisma.familyMember.findUnique({ where: { id: parseInt(relatedMemberId) } });
    if (!relatedMember) throw new Error('Related member not found');

    let generationLevel = relatedMember.generationLevel;
    if (relationType === 'parent') generationLevel += 1;
    else if (relationType === 'child') generationLevel -= 1;

    // Transaction to create Member and Relations
    const result = await prisma.$transaction(async (prisma) => {
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

        // Create bi-directional relations
        await prisma.familyRelation.create({
            data: {
                memberId: newMember.id,
                relatedMemberId: relatedMember.id,
                relationType
            }
        });

        // Inverse relation logic
        let inverseType = 'spouse';
        if (relationType === 'parent') inverseType = 'child';
        else if (relationType === 'child') inverseType = 'parent';

        await prisma.familyRelation.create({
            data: {
                memberId: relatedMember.id,
                relatedMemberId: newMember.id,
                relationType: inverseType
            }
        });

        return newMember;
    });

    // Async trigger for ancestor matching
    matchService.indexMember(result.id).catch(console.error);

    return result;
};

const getMember = async (memberId) => {
    return await prisma.familyMember.findUnique({
        where: { id: parseInt(memberId) },
        include: {
            relationsFrom: { include: { relatedMember: true } },
            relationsTo: { include: { member: true } }
        }
    });
};

const deleteMember = async (memberId) => {
    return await prisma.familyMember.delete({ where: { id: parseInt(memberId) } });
};

module.exports = { addMember, getMember, deleteMember };
