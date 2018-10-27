import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import { ethers } from "ethers";
import ABI from './Contract.abi.json';

const contractAddress = "0x1f8e57d6262d62a5e1fc14f16a44b13e5c3e6e07";

class App extends Component {
  state = {
    wallet: "",
    type: "",
    keywords: "",
    balance: 0,
    bills: ["Road Tax", "Property Tax"]
  }

  componentDidMount() {
    // To connect to a custom URL:
    let url = "http://ethwl2ous-dns-reg1.southeastasia.cloudapp.azure.com:8540";
    let customHttpProvider = new ethers.providers.JsonRpcProvider(url);

    this.provider = customHttpProvider;
    console.log(ABI)

    this.contract = new ethers.Contract(contractAddress, ABI.abi, this.provider);

  }


  /**
   * Register a new wallet which generates a random wallet
   * show the mnemonic; but seriously don't do this its the most important part of the system
   * Should be encrypted or something
   */
  registerWallet = () => {
    let walletInfo = ethers.Wallet.createRandom();
    let wallet = walletInfo.address;
    walletInfo = walletInfo.connect(this.provider);

    this.setState({
      walletInfo: walletInfo,
      wallet: wallet,
      keywords: walletInfo.mnemonic
    })
    this.updateBalance(wallet);
  }

  /**
   * Pay a bill (by name)
   * It will transfer the amount of money that the user has specified to the address
   * that is keyed by the name supplied
   * 
   * In our example we only have two services we can pay to
   */
  payBill = (name) => () => {
    let res = +prompt("Pay the " + name + " bill; how much would you like to pay?")

    if (!res || isNaN(res)) {
      alert("Invalid amount entered, not paying bill " + name);
      return;
    }

    
    var amount = parseInt(res + "");

    let n = ethers.utils.formatBytes32String(name)

    let contractWithSigner = this.contract.connect(this.state.walletInfo);

    contractWithSigner.payService(n, amount).then((r)=> {
      console.log(r);
      alert("Payment accepted and processed " + name + " - total amount " + res)
      this.updateBalance(this.state.wallet);
    })

    // bill pay? initialise bill payment options 
    // once bill payment accepted, refresh the balance
  }

  /**
   * This opens the wallet
   * Opening wallet requires proper mnemonics, which are just keywords
   */
  openWallet = () => {
    try {
      let walletInfo = ethers.Wallet.fromMnemonic(this.state.keywords);
      
      walletInfo = walletInfo.connect(this.provider);
      this.setState({ walletInfo, wallet: walletInfo.address })
      this.updateBalance(walletInfo.address);       
    }
    catch (e) {
      alert("Invalid mnemonics, " + this.state.keywords + " not valid");
    }
  }

  /**
   * Refresh the current account balance for the currently logged in user
   * 
   */
  updateBalance = (wallet) => {
    // get balance, set value
    if (wallet === "") {
      return; // no balance on no wallet
    }

    this.contract.balanceOf(wallet).then((r)=> {
      
      this.setState({balance: r.toNumber()});
    })    
  }

  /**
   * helper method that will interact with the blockchain and actually top-up the wallet
   */
  requestTopup = (total) => {
    // request topup

    // this will be a service call which will eventually update our balance

    let contractWithSigner = this.contract.connect(this.state.walletInfo);

    contractWithSigner.mintForUser(this.state.wallet, total).then((r)=> {
      console.log(r);
      this.updateBalance(this.state.wallet);
    })

  }

  /**
   * Add 50 coins to the wallet; assume that the user is redirected to another "payment gateway" which 
   * does some magic, notifies our system; which then topup the user
   * 
   * In reality, for our demo we just top up 50 straight off the bat; i let you choose the amount you want to
   * top up
   */
  topupWallet = () => {
    let result = +prompt("Please enter amount to top-up", 50);
    if (result < 1 || isNaN(result)) {
      alert("invalid total");
      return;
    }

    this.requestTopup(result);

  }

  ///////////////////////////////////////////////////////////////////
  // NOTE:
  // below is not something that is important to the API services
  ///////////////////////////////////////////////////////////////////

  /**
   * Change the auth type, either user, auth, or admin
   */
  changeAuth = (name) => () => {
    this.setState({ type: name })
  }

  adminAuthUsers = () => {
    let address = prompt("Please enter an address to authorise for management services");
       
    let contractWithSigner = this.contract.connect(this.state.walletInfo);

    contractWithSigner.registerAuthorisedAccount(address).then((r)=> {
      alert("Registration Successful," + address + " is now an authorised address for management services");
    })
  }

  adminRemoveUsers = () => {
    let address = prompt("Please enter an address to remove authorisation for management services");
       
    let contractWithSigner = this.contract.connect(this.state.walletInfo);

    contractWithSigner.unauthorise(address).then((r)=> {
      alert("Execution Successful," + address + " is now an unauthorised address for management services");
    })
  }

  authRegisterService = (name) => () => {
    if (this.state.wallet === "") {
      return;
    }

    let address = prompt("Please enter an address to register as the " + name + " payment service");

    let contractWithSigner = this.contract.connect(this.state.walletInfo);

    let n = ethers.utils.formatBytes32String(name);

    contractWithSigner.registerService(address, n).then((r)=> {
      alert("Registration Successful," + address + " is now mapped to " + name + " payment service");
    })

  }

  /**
   * Get the user section
   * Pay bills (show grid)
   * Topup (choose amount)
   * Transfer (disabled for now)
   */
  getUserSection() {
    let disabled = this.state.wallet && this.state.wallet !== "";
    return (<div style={{ display: this.state.type === "user" ? "block" : "none" }}>
      <h3>User section</h3>
      <button onClick={this.registerWallet} disabled={disabled}>Register</button>
      <p>
        <span style={{ fontSize: "12px" }}>Open wallet by entering your mnemonic keywords</span><br />
        <input type="text" value={this.state.keywords} onChange={(e) => { this.setState({ keywords: e.target.value }) }} />
        <button onClick={this.openWallet}>Open Wallet</button>
      </p>
      <span style={{ fontSize: "12px" }}>Pay Bills</span><br />
      {
        this.state.bills.map(x => {
          return (<button key={x} disabled={!disabled} onClick={this.payBill(x)}>Pay {x}</button>)
        })
      }
      <br />
      <span style={{ fontSize: "12px" }}>Account Services</span><br />
      <button onClick={this.topupWallet} disabled={!disabled}>Topup</button>
      <button disabled>Transfer</button>
    </div>)
  }

  /**
   * Get the admin section 
   * Admin section is for registering authorised users to manage the system
   * as well as remove unauthorised users
   * You can probably ignore this, i use it for setting up and controlling the system parameters
   */
  getAdminSection() {
    return (<div style={{ display: this.state.type === "admin" ? "block" : "none" }}>
      <h3>Admin section</h3>
      <p>
        <span style={{ fontSize: "12px" }}>Open wallet by entering your mnemonic keywords</span><br />
        <input type="text" value={this.state.keywords} onChange={(e) => { this.setState({ keywords: e.target.value }) }} />
        <button onClick={this.openWallet}>Open Wallet</button>
      </p>
      <button onClick={this.adminAuthUsers}>Assign authorised users</button>
      <button onClick={this.adminRemoveUsers}>Unauthorise users</button>
    </div>)
  }

  /**
   * auth section is used to set up the addresses which can accept bill payments
   * You can probably ignore this as well since its an admin function i use to configure the system
   */
  getAuthorisedUsers() {
    return (<div style={{ display: this.state.type === "auth" ? "block" : "none" }}>
      <h3>Authorised section</h3>
      <p>
        <span style={{ fontSize: "12px" }}>Open wallet by entering your mnemonic keywords</span><br />
        <input type="text" value={this.state.keywords} onChange={(e) => { this.setState({ keywords: e.target.value }) }} />
        <button onClick={this.openWallet}>Open Wallet</button>
      </p>
      <button onClick={this.authRegisterService("Road Tax")}>Register Road Tax Payment Service</button>
      <button onClick={this.authRegisterService("Property Tax")}>Register Property Tax Payment Service</button>

    </div>);
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />

          <p>
            Welcome to RZlytics Wallet Sample<br />
            <button onClick={this.changeAuth("user")}>User</button>
            <button onClick={this.changeAuth("admin")}>Admin</button>
            <button onClick={this.changeAuth("auth")}>Authorised</button>
          </p>
          <div style={{ display: this.state.type !== "" ? "block" : "none" }}>
            <span>Your wallet is {this.state.wallet} - {this.state.type}, Balance is {this.state.balance}</span>
            <button onClick={()=>{this.updateBalance(this.state.wallet)}}>Refresh</button>
          </div>
          {this.getUserSection()}
          {this.getAdminSection()}
          {this.getAuthorisedUsers()}
        </header>
      </div>
    );
  }
}

export default App;
