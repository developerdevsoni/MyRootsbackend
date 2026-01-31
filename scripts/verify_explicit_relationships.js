const prisma = require('../src/config/prisma');
const memberService = require('../src/services/member.service');
const treeService = require('../src/services/tree.service');

async function testExplicitRelations() {
    console.log('--- Starting Explicit Relationship Verification ---');

    try {
        // 1. Setup Data
        const user = await prisma.user.create({
            data: { email: `test_explicit_${Date.now()}@example.com`, password: 'password', name: 'ExplicitUser' }
        });
        const tree = await prisma.familyTree.create({
            data: { title: 'Explicit Tree', userId: user.id }
        });

        console.log(`Setup Tree: ${tree.id}`);

        // 2. Create Child
        // Manually create the first member (Root) using prisma to bootstrap.
        const childRaw = await prisma.familyMember.create({
            data: { treeId: tree.id, name: 'Child', gender: 'male', generationLevel: 0 }
        });
        console.log('Created Child (Root)');

        // 3. Add Father (Relation: Parent)
        console.log('Adding Father...');
        const father = await memberService.addMember({
            treeId: tree.id,
            relatedMemberId: childRaw.id,
            relationType: 'parent',
            name: 'Father',
            gender: 'male',
            role: 'father'
        });

        // 4. Add Mother (Relation: Parent)
        console.log('Adding Mother...');
        const mother = await memberService.addMember({
            treeId: tree.id,
            relatedMemberId: childRaw.id,
            relationType: 'parent',
            name: 'Mother',
            gender: 'female',
            role: 'mother'
        });

        // 5. VERIFY: NO Spouse Relation between Father and Mother
        const spouseRel = await prisma.familyRelation.findFirst({
            where: {
                relationType: 'spouse',
                OR: [
                    { memberId: father.id, relatedMemberId: mother.id },
                    { memberId: mother.id, relatedMemberId: father.id }
                ]
            }
        });

        if (!spouseRel) {
            console.log('✅ PASS: No auto-spouse creation between parents.');
        } else {
            console.log('❌ FAIL: Spouse relation auto-created!', spouseRel);
        }

        // 6. VERIFY: ParentChild Table
        const pcRelations = await prisma.parentChild.findMany({
            where: { childId: childRaw.id }
        });
        console.log(`ParentChild count for Child: ${pcRelations.length} (Expected 2)`);
        if (pcRelations.length === 2) console.log('✅ PASS: Both parents linked explicitly.');
        else console.log('❌ FAIL: Incorrect parent count.');

        // 7. Add Spouse to Child (Explicit)
        console.log('Adding Spouse to Child...');
        const childSpouse = await memberService.addMember({
            treeId: tree.id,
            relatedMemberId: childRaw.id,
            relationType: 'spouse',
            name: 'ChildSpouse',
            gender: 'female'
        });

        // Verify Spouse Link
        const spouseLink = await prisma.familyRelation.findFirst({
            where: { relationType: 'spouse', memberId: childRaw.id, relatedMemberId: childSpouse.id } // Order might differ
        });
        
        const link = await prisma.familyRelation.findFirst({
            where: {
                OR: [
                     { memberId: childRaw.id, relatedMemberId: childSpouse.id },
                     { memberId: childSpouse.id, relatedMemberId: childRaw.id }
                ]
            }
        });
        if (link) console.log('✅ PASS: Spouse explicitly linked.');
        else console.log('❌ FAIL: Spouse link missing.');

        // 8. Test getFamilyTree Structure
        console.log('Fetching Family Tree...');
        const treeJson = await treeService.getFamilyTree(tree.id);
        // console.log(JSON.stringify(treeJson, null, 2));

        // Roots should be Father and Mother (since they have no parents)
        // Child should be under them.
        // Wait, if Father and Mother are not spouses, do they appear as separate roots?
        // Yes, likely.
        const fatherNode = treeJson.nodes.find(n => n.name === 'Father');
        const motherNode = treeJson.nodes.find(n => n.name === 'Mother');
        
        if (fatherNode && motherNode) console.log('✅ PASS: Parents identified as Roots.');
        else console.log('❌ FAIL: Parents NOT identified as Roots.');

        // Verify Child is under Father
        const childInFather = fatherNode.children.find(c => c.name === 'Child');
        if (childInFather) console.log('✅ PASS: Child found under Father.');
        else console.log('❌ FAIL: Child NOT under Father.');

        // Verify Child has Spouse in JSON
        if (childInFather && childInFather.spouses.some(s => s.name === 'ChildSpouse')) {
            console.log('✅ PASS: Child has spouse in tree JSON.'); // Child might be listed under both if linked, but structurally under father.
        } else {
            console.log('❌ FAIL: Child spouse missing in JSON.');
        }

        // Cleanup
        await prisma.parentChild.deleteMany({});
        await prisma.familyRelation.deleteMany({});
        await prisma.familyMember.deleteMany({});
        await prisma.familyTree.deleteMany({});
        await prisma.user.deleteMany({}); // Warning: wipes users. In dev test env ok.
        
        console.log('Cleanup Done.');

    } catch (e) {
        console.error('TEST FAILED:', e);
    } finally {
        await prisma.$disconnect();
    }
}

testExplicitRelations();
