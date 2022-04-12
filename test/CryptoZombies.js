const CryptoZombies = artifacts.require("CryptoZombies");
const zombieNames = ["Zombie 1", "Zombie 2"];

const utils = require("./helpers/utils");
const expect = require('chai').expect;

contract("CryptoZombies", (accounts) => {
    let [alice, bob] = accounts;
    let contractInstance;

    beforeEach(async () => {
        contractInstance = await CryptoZombies.new();
    });

    afterEach(async () => {
        await contractInstance.kill();
    });

    it("should be able to create a new zombie", async () => {
        const result = await contractInstance.createRandomZombie(zombieNames[0], {from: alice});

        expect(result.receipt.status).to.equal(true);
        expect(result.logs[0].args.name).to.equal(zombieNames[0]);
    });

    it("should not allow two zombies", async () => {
        await contractInstance.createRandomZombie(zombieNames[0], {from: alice});

        await utils.shouldThrow(contractInstance.createRandomZombie(zombieNames[1], {from: alice}));
    });

    context("with the single-step transfer scenario", async () => {
        it("should transfer a zombie", async () => {
            const createdZombie = await contractInstance.createRandomZombie(zombieNames[0], {from: alice});
            const createdZombieId = createdZombie.logs[0].args.zombieId.toNumber();

            await contractInstance.transferFrom(alice, bob, createdZombieId, {from: alice});

            const newOwner = await contractInstance.ownerOf(createdZombieId);
            expect(newOwner).to.equal(bob);
        });
    });

    context("with the two-step transfer scenario", async () => {
        it("should approve and then transfer a zombie when the approved address calls transferFrom", async () => {
            const createdZombie = await contractInstance.createRandomZombie(zombieNames[0], {from: alice});
            const createdZombieId = createdZombie.logs[0].args.zombieId.toNumber();

            await contractInstance.approve(bob, createdZombieId, {from: alice});
            await contractInstance.transferFrom(alice, bob, createdZombieId, {from: bob});

            const newOwner = await contractInstance.ownerOf(createdZombieId);
            expect(newOwner).to.equal(bob);
        });

        it("should approve and then transfer a zombie when the owner calls transferFrom", async () => {
            const result = await contractInstance.createRandomZombie(zombieNames[0], {from: alice});
            const createdZombieId = result.logs[0].args.zombieId.toNumber();

            await contractInstance.approve(bob, createdZombieId, {from: alice});
            await contractInstance.transferFrom(alice, bob, createdZombieId, {from: alice});

            const newOwner = await contractInstance.ownerOf(createdZombieId);
            expect(newOwner).to.equal(bob);
        });
    });

    it("zombies should be able to attack another zombie", async () => {
        let result;
        await contractInstance.setCooldownTime(0);
        result = await contractInstance.createRandomZombie(zombieNames[0], {from: alice});
        const firstZombieId = result.logs[0].args.zombieId.toNumber();
        result = await contractInstance.createRandomZombie(zombieNames[1], {from: bob});
        const secondZombieId = result.logs[0].args.zombieId.toNumber();

        await contractInstance.attack(firstZombieId, secondZombieId, {from: alice});
        expect(result.receipt.status).to.equal(true);
    });
});
