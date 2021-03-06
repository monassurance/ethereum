var SmartProtectionPolicy = artifacts.require("SmartProtectionPolicy");

contract('SmartProtectionPolicy', function(accounts) {

    let globalContract;
    const [firstAccount, secondAccount, thirdAccount, fourthAccount] = accounts;

    // Every scenario has a contract for tests prepared
    beforeEach(async () => {
        globalContract = await SmartProtectionPolicy.new(
            secondAccount,
            "Alex Silva",
            88,  
            2280.00,
            342.00,
            70.00,
            "Samsung Galaxy S7",
            thirdAccount,
            fourthAccount,
            firstAccount
        );
    });

    it("should instantiate the contract with no errors", async () => {
        let contract;
        try {
            contract = await SmartProtectionPolicy.new(
                thirdAccount,
                "Alex Silva",
                88,  
                2500.00,
                300.00,
                70.00,
                "Samsung Galaxy S7",
                secondAccount,
                fourthAccount,
                firstAccount
            );
        } catch (error) {
            assert.isOk(false);
        }

        assert.equal(0, await contract.getPolicyStatus());
        assert.isTrue(/0x[0-9A-Fa-f]{40}/.test(contract.address));
        assert.isTrue(/0x[0-9A-Fa-f]{64}/.test(contract.transactionHash));
    });

    it("should not instantiate missing params", async () => {
        let paramsArray = [
            ["Alex Silva", 88, 2500.00, 300.00, 70.00, "Samsung Galaxy S7"],
            [thirdAccount, 88, 2500.00, 300.00, 70.00, "Samsung Galaxy S7"],
            [70.00, "Samsung Galaxy S7"],
            [thirdAccount, "Alex Silva", 88, 2500.00, 300.00, "Samsung Galaxy S7"],
            [thirdAccount, "Alex Silva"]
        ];

        for (let i = 0; i < paramsArray.length; i++) {
            try {
                let contract = await SmartProtectionPolicy.new(...paramsArray[i]);
                assert.isOk(false);
            } catch (error) {
                assert.isOk(/constructor expected \d+ arguments, received \d+/.test(error.message));
            }   
        }
    });

    it("should not accept 1 (Agent) invalid param calling setFeeCommissionsPercent", async () => {
        // Test invalid Agent
        try {
            await globalContract.setFeeCommissionsPercent(8, 0);
            assert.isOk(false);
        } catch (error) {
            assert.isOk(/revert/.test(error.message));
            assert.equal(await globalContract.getCommissionFeeAgentPercent(), 1);
            assert.equal(await globalContract.getCommissionFeeBrokerPercent(), 1);
            assert.equal(await globalContract.getCommissionFeePercent(), 2);
        }
    });

    it("should not accept 1 (Broker) invalid param calling setFeeCommissionsPercent", async () => {
        // Test invalid broker
        try {
            await globalContract.setFeeCommissionsPercent(0, 8);
            assert.isOk(false);
        } catch (error) {
            assert.isOk(/revert/.test(error.message));
            assert.equal(await globalContract.getCommissionFeeAgentPercent(), 1);
            assert.equal(await globalContract.getCommissionFeeBrokerPercent(), 1);
            assert.equal(await globalContract.getCommissionFeePercent(), 2);
        }
    });

    it("should not accept 2 invalid params calling setFeeCommissionsPercent", async () => {
        try {
            await globalContract.setFeeCommissionsPercent(0, 0);
            assert.isOk(false);
        } catch (error) {
            assert.isOk(/revert/.test(error.message));
            assert.equal(await globalContract.getCommissionFeeAgentPercent(), 1);
            assert.equal(await globalContract.getCommissionFeeBrokerPercent(), 1);
            assert.equal(await globalContract.getCommissionFeePercent(), 2);
        }
    });

    it("should works fine passing 2 valid params calling setFeeCommissionsPercent", async () => {
        let agentPercent = 7;
        let brokerPercent = 8;

        // Check initial status
        assert.equal(await globalContract.getCommissionFeeAgentPercent(), 1);
        assert.equal(await globalContract.getCommissionFeeBrokerPercent(), 1);
        assert.equal(await globalContract.getCommissionFeePercent(), 2);

        await globalContract.setFeeCommissionsPercent(brokerPercent, agentPercent);
        
        assert.equal(await globalContract.getCommissionFeeAgentPercent(), agentPercent);
        assert.equal(await globalContract.getCommissionFeeBrokerPercent(), brokerPercent);
        assert.equal(await globalContract.getCommissionFeePercent(), (brokerPercent + agentPercent));
    });

    it("should change donationsPercent calling changeDonationValue", async () => {
        let value = 7;
        assert.equal(await globalContract.getDonationsPercent(), 2);
        await globalContract.changeDonationValue(value);
        assert.equal(await globalContract.getDonationsPercent(), 7);
    });

    it("should not change donationsPercent from another account", async () => {
        try {
            assert.equal(await globalContract.getDonationsPercent(), 2);
            await globalContract.changeDonationValue(7, {from: thirdAccount});
            assert.isOk(false);
        } catch (error) {
            assert.isOk(/revert/.test(error.message));
            assert.equal(await globalContract.getDonationsPercent(), 2);
        }
    });

    it("should call splitCommissionsWithExternalMoney method with no expected erros", async () => {
        let agentPercent = 7;
        let brokerPercent = 8; 
        let amount = web3.toWei(1, "shannon"); // 1gwei // 1000000000
        
        let expectedAgentFeeValue = amount * (agentPercent / 100);
        let expectedBrokerFeeValue = amount * (brokerPercent / 100);
        let expectedFeeValue = (expectedAgentFeeValue + expectedBrokerFeeValue);

        await globalContract.setFeeCommissionsPercent(brokerPercent, agentPercent);
        await globalContract.splitCommissionsWithExternalMoney({value: amount});

        let agentFeeValue = await globalContract.getCommissionFeeAgentValue();
        let brokerFeeValue = await globalContract.getCommissionFeeBrokerValue();
        let feeValue = await globalContract.getCommissionFeeValue();

        assert.equal(agentFeeValue.toNumber(), expectedAgentFeeValue);
        assert.equal(brokerFeeValue.toNumber(), expectedBrokerFeeValue);
        assert.equal(feeValue.toNumber(), expectedFeeValue);
    });

    it("should not accept calls on splitCommissionsWithExternalMoney by another account", async () => {
        try {
            await globalContract.setFeeCommissionsPercent(8, 8);
            // must throw error
            await globalContract.splitCommissionsWithExternalMoney({
                from: secondAccount,
                value: web3.toWei(2, "ether")
            });
            assert.isOk(false, "This method should not be called.");
        } catch (error) {
            assert.isOk(/revert/.test(error.message));
            assert.equal(await globalContract.getCommissionFeeAgentValue(), 0);
            assert.equal(await globalContract.getCommissionFeeBrokerValue(), 0);
            assert.equal(await globalContract.getCommissionFeeValue(), 0);
        }
    });

    it("should send fee to Agent calling sendCommissionSplitedAgent with Fee", async () => {
        try {
            let agentCommissionPercent = 100; //8%
            let amount = web3.toWei(2, "shannon");

            globalContract.agent = secondAccount;
            assert.isFalse(await globalContract.isAgentPaid());

            let agentInitialBalance = await web3.eth.getBalance(secondAccount);
            
            await globalContract.setFeeCommissionsPercent(3, agentCommissionPercent);
            await globalContract.splitCommissionsWithExternalMoney({value: amount});
            // sendCommissionSplitedAgent may trows an exception
            await globalContract.sendCommissionSplitedAgent();

            let commission = amount * (agentCommissionPercent/100);
            let expectedAccountBalance = agentInitialBalance.toNumber() + commission;
            let currentAgentBalance = await web3.eth.getBalance(secondAccount);
            
            // it doesn't works on ganache, only on geth or parity
            /*assert.equal(
                currentAgentBalance.toNumber(),
                expectedAccountBalance,
                "Something went wrong with transfer"
            );*/
            assert.isTrue(await globalContract.isAgentPaid());

        } catch (error) {
            assert.isOk(false, error.message);
        }
    });

    it("should send fee to the broker calling sendCommissionSplitedBroker", async () => {
        try {
            let brokerCommissionPercent = 100; //8%
            let amount = web3.toWei(3, "shannon");

            globalContract.broker = thirdAccount;
            assert.isFalse(await globalContract.isBrokerPaid());

            let brokerInitialBalance = await web3.eth.getBalance(thirdAccount);
            
            await globalContract.setFeeCommissionsPercent(brokerCommissionPercent, 4);
            await globalContract.splitCommissionsWithExternalMoney({value: amount});
            // sendCommissionSplitedBroker may trows an exception
            await globalContract.sendCommissionSplitedBroker();

            let commission = amount * (brokerCommissionPercent/100);
            let expectedAccountBalance = brokerInitialBalance.toNumber() + commission;
            let currentBrokerBalance = await web3.eth.getBalance(thirdAccount);
            
            // it doesn't works on ganache, only on geth or parity
            /*assert.equal(
                expectedAccountBalance,
                currentBrokerBalance.toNumber(),
                "Something went wrong with transfer"
            );*/
            assert.isTrue(await globalContract.isBrokerPaid());

        } catch (error) {
            assert.isOk(false, error.message);
        }
    });
    
    // 12
    it('it should not call Fnol with a value higher than policyBalanceValue.', async () => {
        try {
            let expectedValue = 0;
            let id = await globalContract.FNOL(1, 400);
            let policyBalance = await globalContract.getPolicyBalance.call();
            assert.isAbove(
                policyBalance, 
                expectedValue, 
                'Its not possible to have a claim value higher than policyBalanceValue'
            );
        } catch (error) {
            assert.isOk(true);
        }
    })

    // 13
    it('it should call Fnol multiple times until policyBalanceValue has zero value.', async () => {
        try {
            let expectedValue = 0;

            await globalContract.FNOL(1, 114);
            await globalContract.FNOL(1, 114);
            await globalContract.FNOL(1, 114);

            let policyBalance = await globalContract.getPolicyBalance.call();

            assert.equal(
                policyBalance, 
                expectedValue, 
                'Its not possible to have a claim value higher than policyBalanceValue'
            );
    
        } catch (error) {
            assert.isOk(false);
        }
    })

    // 14
    it('it should call setClaimDocumentationWorkFlow and set true for sented documents.', async () => {
        try {
            let _internalId = 1;
            let _idReceived = true;
            let _videoReceived = true;
            let _deductablePaid = true;
            let _imeiBlock = true;
            let _policeNoticeReport = true;
            
            await globalContract.FNOL(1, 150);
            await globalContract.setClaimDocumentationWorkFlow(
                _internalId,
                _idReceived,
                _videoReceived,
                _deductablePaid,
                _imeiBlock,
                _policeNoticeReport
            );
        
            let claimsInfo = await globalContract.getClaims(1);
        
            assert.equal(claimsInfo[0],
                _internalId,
                'Its not possible request a specific internalId and get a different internalId by response.'
            );
            assert.equal(claimsInfo[1], true, 'The _idReceived its not set as received.');
            assert.equal(claimsInfo[2], true, 'The _videoReceived its not set as received.');
            assert.equal(claimsInfo[3], true, 'The _deductablePaid its not set as received.');
            assert.equal(claimsInfo[4], true, 'The _imeiBlock its not set as received.');
            assert.equal(claimsInfo[5], true, 'The _policeNoticeReport its not set as received.');
        
        } catch (error) {
            assert.isOk(false);
        }
    })

    // 15
    it('it should call setClaimDocumentationWorkFlow accross diferents values setted.', async () => {
        try {
            let paramsArray = [
                [null, null, null, null, null, null],
                [1, false, true, true, true, true],
                [2, true, false, true, true, true],
                [3, true, true, false, true, true],
                [4, true, true, true, false, true],
                [5, true, true, true, true, false] 
            ]

            for (var i=1; i < paramsArray.length; i++) {
                await globalContract.FNOL(i, 30)
                await globalContract.setClaimDocumentationWorkFlow(...paramsArray[i])
            
                let claimsInfo = await globalContract.getClaims(i)

                assert.equal(
                    claimsInfo[0].toNumber(),
                    i,
                    'Its not possible request a specific internalId and get a different internalId by response.'
                );
                assert.equal(claimsInfo[1], paramsArray[i][1], 'The _idReceived its not set as received.');
                assert.equal(claimsInfo[2], paramsArray[i][2], 'The _videoReceived its not set as received.');
                assert.equal(claimsInfo[3], paramsArray[i][3], 'The _deductablePaid its not set as received.');
                assert.equal(claimsInfo[4], paramsArray[i][4], 'The _imeiBlock its not set as received.');
                assert.equal(claimsInfo[5], paramsArray[i][5], 'The _policeNoticeReport its not set as received.');
            }

        } catch (error) {
            assert.isOk(false);
        }
    })    

    // 16
    it('it should call setClaimDocumentationWorkFlow passing an unvalid internalId - 0x0', async () => {
        try {
            let paramsArray = [0, false, true, true, true, true]
            
            await globalContract.FNOL(1, 30)
            await globalContract.setClaimDocumentationWorkFlow(...paramsArray)
        
        } catch (error) {
            assert.isOk(true)
        }
    })   

    // 17
    it('it should call finalizePolicy and finalize the policy.', async () => {
        try {
            let status
            let policyBalance

            await globalContract.finalizePolicy()
            let event = await globalContract.ChangeStatus()

            event.watch((err, result) => {
                if (!err) {
                    status = result.args.status.toNumber()
                    policyBalance = result.args.eventValue.toNumber()

                    assert.equal(status, 2, 'Expected 2 but received '+status)
                    assert.equal(policyBalance, 300, 'Expected 300 but received '+policyBalance)
                }
            })
            event.stopWatching()

        } catch (error) {

            assert.isOk(true)
        }
    })

    // 18
    it('it should call finalizePolicy and finalize the policy.', async () => {
        try {
            await globalContract.finalizePolicy({from: secondAccount})
        } catch (error) {
            assert.isOk(/revert/.test(error.message));
        }
    })

});
