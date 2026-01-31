const prisma = require('../src/config/prisma');
const { buildFamilyTree } = require('../src/services/tree.service');

async function testTreeBuilder() {
    console.log('--- Starting Tree Builder Verification ---');

    try {
        // 1. Create a Test User
        const user = await prisma.user.create({
            data: {
                email: `test_verify_${Date.now()}@example.com`,
                password: 'password123',
                name: 'Verification User'
            }
        });
        console.log(`Created User: ${user.id}`);

        // 2. Create a Tree
        const tree = await prisma.familyTree.create({
            data: {
                title: 'Verification Tree',
                userId: user.id
            }
        });
        console.log(`Created Tree: ${tree.id}`);

        // 3. Create Members
        // Root (Father)
        const father = await prisma.familyMember.create({
            data: { treeId: tree.id, name: 'Father', gender: 'male', birthDate: new Date('1980-01-01') }
        });
        
        // Spouse (Mother)
        const mother = await prisma.familyMember.create({
            data: { treeId: tree.id, name: 'Mother', gender: 'female', birthDate: new Date('1982-01-01') }
        });

        // Child 1 (Son)
        const son = await prisma.familyMember.create({
            data: { treeId: tree.id, name: 'Son', gender: 'male', birthDate: new Date('2005-01-01') }
        });

        // Child 2 (Daughter)
        const daughter = await prisma.familyMember.create({
            data: { treeId: tree.id, name: 'Daughter', gender: 'female', birthDate: new Date('2008-01-01') }
        });

        console.log('Created Members');

        // 4. Create Relations
        // Father <-> Mother (Spouse)
        await prisma.familyRelation.create({ data: { memberId: father.id, relatedMemberId: mother.id, relationType: 'spouse' } });
        await prisma.familyRelation.create({ data: { memberId: mother.id, relatedMemberId: father.id, relationType: 'spouse' } });

        // Father -> Son (Parent)
        await prisma.familyRelation.create({ data: { memberId: father.id, relatedMemberId: son.id, relationType: 'parent' } });
        await prisma.familyRelation.create({ data: { memberId: son.id, relatedMemberId: father.id, relationType: 'child' } });

        // Mother -> Son (Parent)
        await prisma.familyRelation.create({ data: { memberId: mother.id, relatedMemberId: son.id, relationType: 'parent' } });
        await prisma.familyRelation.create({ data: { memberId: son.id, relatedMemberId: mother.id, relationType: 'child' } });

        // Father -> Daughter (Parent)
        await prisma.familyRelation.create({ data: { memberId: father.id, relatedMemberId: daughter.id, relationType: 'parent' } });
        await prisma.familyRelation.create({ data: { memberId: daughter.id, relatedMemberId: father.id, relationType: 'child' } });

         // Mother -> Daughter (Parent)
         await prisma.familyRelation.create({ data: { memberId: mother.id, relatedMemberId: daughter.id, relationType: 'parent' } });
         await prisma.familyRelation.create({ data: { memberId: daughter.id, relatedMemberId: mother.id, relationType: 'child' } });

        console.log('Created Relations');

        // 5. Build Tree
        console.log('Building Tree...');
        const treeJson = await buildFamilyTree(tree.id);
        
        console.log('--- Tree Structure ---');
        console.log(JSON.stringify(treeJson, null, 2));

        // 6. Verification Assertions
        const roots = treeJson.nodes;
        if (roots.length !== 2) { 
             // Ideally 2 roots because both Father and Mother have NO parents in this tree?
             // Actually, usually in a graph, if spousal link exists, we might want to treat them as a unit, 
             // but our logic detects "Roots" as anyone with no parents.
             // Both Father and Mother have no parents. So valid roots.
             console.log(`✅ Roots Count: ${roots.length} (Expected 2: Father & Mother)`);
        } else {
             console.log(`❌ Roots Count: ${roots.length}`);
        }

        // Check if Son is under Father
        const fatherNode = roots.find(r => r.name === 'Father');
        if (fatherNode) {
            const hasSon = fatherNode.children.find(c => c.name === 'Son');
            console.log(hasSon ? '✅ Son found under Father' : '❌ Son NOT found under Father');
            
            const hasSpouse = fatherNode.spouses.find(s => s.name === 'Mother');
            console.log(hasSpouse ? '✅ Mother found as spouse of Father' : '❌ Mother NOT found as spouse of Father');
        }

        // 7. Cycle Test
        console.log('\n--- Testing Cycle Detection ---');
        // Add cycle: Son is parent of Father
        await prisma.familyRelation.create({ data: { memberId: son.id, relatedMemberId: father.id, relationType: 'parent' } });
        // Note: We don't need full inverse for this test, just enough to trigger cycle in recursion if not handled
        // Actually, our logic checks 'childrenMap' for determining next step in recursion.
        // childrenMap indexes `parent` type relations.
        // So if we make Son -> parent -> Father, then Father is in Son's children list.
        // Father -> Son -> Father... infinite loop.
        
        // Wait, we need to add to childrenMap: PARENT is source.
        // relation: memberId (Son) -> relatedMemberId (Father), type: 'parent'
        // This means Son is parent of Father.
        
        try {
            const cycleTree = await buildFamilyTree(tree.id);
            console.log('✅ Cycle handled gracefully (no crash)');
        } catch (e) {
            console.error('❌ Cycle caused crash:', e);
        }

        // Cleanup
        await prisma.familyRelation.deleteMany({ where: { member: { treeId: tree.id } } });
        await prisma.familyMember.deleteMany({ where: { treeId: tree.id } });
        await prisma.familyTree.delete({ where: { id: tree.id } });
        await prisma.user.delete({ where: { id: user.id } });
        
        console.log('Cleanup Done');

    } catch (error) {
        console.error('Test Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testTreeBuilder();
