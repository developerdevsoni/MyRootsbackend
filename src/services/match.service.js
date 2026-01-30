const prisma = require('../config/prisma');
const transporter = require('../config/nodemailer');

const normalizeName = (name) => {
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
};

const sendMatchEmail = async (matchData) => {
    const { userA, userB, memberA, memberB } = matchData;

    const mailOptionsA = {
        from: '"MyRoots Matcher" <noreply@myroots.com>',
        to: userA.email,
        subject: 'New Ancestor Match Found!',
        text: `Hello ${userA.name || 'User'},\n\nWe found a potential match for your ancestor "${memberA.name}".\n\nMatched with "${memberB.name}" from ${userB.name || 'another user'}'s tree.\n\nLog in to view details.`
    };

    const mailOptionsB = {
        from: '"MyRoots Matcher" <noreply@myroots.com>',
        to: userB.email,
        subject: 'New Ancestor Match Found!',
        text: `Hello ${userB.name || 'User'},\n\nWe found a potential match for your ancestor "${memberB.name}".\n\nMatched with "${memberA.name}" from ${userA.name || 'another user'}'s tree.\n\nLog in to view details.`
    };

    try {
        await transporter.sendMail(mailOptionsA);
        await transporter.sendMail(mailOptionsB);
        console.log(`Match emails sent to ${userA.email} and ${userB.email}`);
    } catch (error) {
        console.error('Error sending match emails:', error);
    }
};

const createMatch = async (indexA, indexB) => {
    // Check if match already exists
    const existingMatch = await prisma.ancestorMatch.findFirst({
        where: {
            OR: [
                { memberAId: indexA.memberId, memberBId: indexB.memberId },
                { memberAId: indexB.memberId, memberBId: indexA.memberId }
            ]
        }
    });

    if (existingMatch) return;

    // Calculate score (simple for now)
    let score = 0.5; // Base score
    if (indexA.normalizedName === indexB.normalizedName) score += 0.3;
    if (indexA.birthYearApprox && indexB.birthYearApprox) {
        if (Math.abs(indexA.birthYearApprox - indexB.birthYearApprox) <= 2) score += 0.2;
    }

    const match = await prisma.ancestorMatch.create({
        data: {
            memberAId: indexA.memberId,
            memberBId: indexB.memberId,
            treeAId: indexA.treeId,
            treeBId: indexB.treeId,
            confidenceScore: score
        }
    });

    // Fetch details for email
    const memberA = await prisma.familyMember.findUnique({ where: { id: indexA.memberId } });
    const memberB = await prisma.familyMember.findUnique({ where: { id: indexB.memberId } });
    const treeA = await prisma.familyTree.findUnique({ where: { id: indexA.treeId }, include: { user: true } });
    const treeB = await prisma.familyTree.findUnique({ where: { id: indexB.treeId }, include: { user: true } });

    await sendMatchEmail({
        userA: treeA.user,
        userB: treeB.user,
        memberA,
        memberB
    });

    return match;
};

const indexMember = async (memberId) => {
    const member = await prisma.familyMember.findUnique({
        where: { id: parseInt(memberId) },
        include: { tree: true }
    });

    if (!member) return;

    // Create or Update Index
    const normalizedName = normalizeName(member.name);
    const birthYear = member.birthDate ? member.birthDate.getFullYear() : null;

    const index = await prisma.ancestorIndex.upsert({
        where: { memberId: member.id },
        update: {
            normalizedName,
            generationLevel: member.generationLevel,
            birthYearApprox: birthYear,
            location: member.location
        },
        create: {
            memberId: member.id,
            userId: member.tree.userId,
            treeId: member.treeId,
            normalizedName,
            generationLevel: member.generationLevel,
            birthYearApprox: birthYear,
            location: member.location
        }
    });

    // Find Matches
    const potentialMatches = await prisma.ancestorIndex.findMany({
        where: {
            userId: { not: member.tree.userId }, // different user
            normalizedName: normalizedName, // same name
            // Optional: Filter by birth year proximity if exists
            ...(birthYear ? {
                birthYearApprox: {
                    gte: birthYear - 5,
                    lte: birthYear + 5
                }
            } : {})
        }
    });

    for (const matchIndex of potentialMatches) {
        await createMatch(index, matchIndex);
    }
};

const getMyMatches = async (userId) => {
    // Determine trees owned by user
    const trees = await prisma.familyTree.findMany({ where: { userId }, select: { id: true } });
    const treeIds = trees.map(t => t.id);

    return await prisma.ancestorMatch.findMany({
        where: {
            OR: [
                { treeAId: { in: treeIds } },
                { treeBId: { in: treeIds } }
            ]
        },
        orderBy: { confidenceScore: 'desc' }
    });
};

const getTreeMatches = async (treeId) => {
    return await prisma.ancestorMatch.findMany({
        where: {
            OR: [
                { treeAId: parseInt(treeId) },
                { treeBId: parseInt(treeId) }
            ]
        },
        orderBy: { confidenceScore: 'desc' }
    });
};

module.exports = { indexMember, getMyMatches, getTreeMatches };
