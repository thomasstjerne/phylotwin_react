import React from "react";
import {
  authenticate as logUserIn,
  logout as logUserOut,
  getTokenUser,
  JWT_STORAGE_NAME,
} from "../../Auth/userApi";

import {getTrees} from '../../Api'

// Initializing and exporting AppContext - common for whole application
export const AppContext = React.createContext({});


class ContextProvider extends React.Component {

  state = {
    runID: null,
    step: 0,
    currentTask: null,
    user: getTokenUser(),
    preparedTrees: [],
    login: (values) => {
      return this.login(values);
    },
    logout: () => {
      this.logout();
    },
    setRunID: runID => this.setState({runID }),
    setStep: step => this.setState({step}),
    setCurrentTask: currentTask => this.setState({currentTask})

  };

  componentDidMount() {
    
    Promise.all([getTrees()])
    .then(responses => {
      this.setState({preparedTrees: responses[0]?.data})
    })


  }
  login = ({ username, password, remember }) => {
    return logUserIn(username, password, remember).then((user) => {
      const jwt = user.token;
      sessionStorage.setItem(JWT_STORAGE_NAME, jwt);
      if (remember) {
        localStorage.setItem(JWT_STORAGE_NAME, jwt);
      }
      this.setState({ user: { ...user } });
      return user;
      // this.getUserItems(user);
    });
  };

  logout = () => {
    logUserOut();
    this.setState({ user: null });
  };

  

  render() {
    return (
      <AppContext.Provider value={this.state}>
        {this.props.children}
      </AppContext.Provider>
    );
  }
}

export default ContextProvider;
