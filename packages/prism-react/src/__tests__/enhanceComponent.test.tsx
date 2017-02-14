import * as React from 'react';
import { shallow, mount } from 'enzyme';
import { createStore } from 'redux';
import { Provider, connect } from 'react-redux';

import enhanceComponent from '../enhanceComponent';

interface HelloWorldProps {
  name: string
};

interface FooBarProps {
  name: string,
  onClick: React.EventHandler<any>
};

interface NestedModel {
  name: string
};

interface SuperModel {
  nested: NestedModel
};

interface Action {
  type: string
};

const HelloWorld = ({ name } : HelloWorldProps) => <div>Hello {name}!</div>;
const FooBar = ({ onClick, name } : FooBarProps) => <button onClick={onClick}>{name}</button>;

const EnhancedHelloWorld = enhanceComponent<NestedModel>(connect(
  state => ({
    name: state.name
  })
)(HelloWorld));

const EnhancedFooBar = enhanceComponent(connect(
  ({ name }) => ({ name }),
  {
    onClick: () => ({ type: 'Bar' })
  }
)(FooBar));

describe('enhanceComponent', () => {
  it('should render the content of enhanceable component', () => {
    const component = shallow(<HelloWorld name="Tomas Weiss" />);

    expect(component.text()).toEqual('Hello Tomas Weiss!');
  });

  it('should allow connect nesting by providing selector', () => {
    const initialState : SuperModel = {
      nested: {
        name: 'Tomas Weiss'
      }
    };

    const identityReducer = (value : SuperModel = initialState) => value;
    const store = createStore(identityReducer);

    const component = mount(
      <Provider store={store}>
        <EnhancedHelloWorld
          selector={state => state.nested}
          wrapper={type => `Foo.${type}`}
        />
      </Provider>
    );

    expect(component.text()).toEqual('Hello Tomas Weiss!');
  });

  it('should allow wrapping all the outgoing actions in redux store context', () => {
    const store = createStore((value : number = 0, { type } : Action) => {
      if (type === 'Foo.Bar') {
        return 42;
      } else {
        return value;
      }
    });

    const component = mount(
      <Provider store={store}>
        <EnhancedFooBar
          selector={value => value}
          wrapper={type => `Foo.${type}`}
        />
      </Provider>
    );

    component.find('button').simulate('click');

    expect(store.getState()).toEqual(42);
  });

  it('should allow nested wrapping & selectors', () => {
    const appState = {
      foo: {
        nested: {
          name: 'Tomas Weiss'
        }
      }
    };

    const store = createStore((state = appState, action : Action) => {
      if (action.type === 'Root.Sub.Bar') {
        return {
          ...state,
          foo: {
            ...state.foo,
            nested: {
              name: 'John Doe'
            }
          }
        };
      }

      return state;
    });

    const Root = () => (
      <EnhancedFooBar
        wrapper={type => `Sub.${type}`}
        selector={state => state.nested}
      />
    );

    const EnhancedRoot = enhanceComponent(connect(
      state => state
    )(Root));

    const component = mount(
      <Provider store={store}>
        <EnhancedRoot
          wrapper={type => `Root.${type}`}
          selector={state => state.foo}
        />
      </Provider>
    );

    const button = component.find('button');

    expect(button.text()).toEqual('Tomas Weiss');
    button.simulate('click');
    expect(button.text()).toEqual('John Doe');
  });
});
