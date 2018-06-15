# Example 4: Configuration Profiles
(WORK IN PROGRESS)

This is an example of configuration profiles. These are very handy when you want to load a predefined configuration of plugins. This allows e.g. for "staging" environments to support QA processes, privacy settings where you load individual selections based on a user's chosen privacy level, and many more.

## Defining Profiles
A profile is defined by simply passing an object with key/value pairs to the `plugins` option on initialization. So instead of passing an Array with plugins you pass an object that contains the "profile objects". Additionally you have to define the name of profile to be used, using the `profile` option. Otherwise datalayer.js will not knnow which profile to activate and just throw an error.

```javascript
import MyPlugin from './some/module/myplugin';
import MyOtherPlugin from './some/module/myotherplugin';
import PluginToBeTested from './some/module/tobetested';

// this is our public/global profile that will be available in all setups
const publicProfile = [
  new MyPlugin({
    someProp: 'I am active in all profiles',
  }),
  new MyOtherPlugin({
    someProp: 'I am active in all profiles, too',
  }),
];

// this is our test profile, extending the public profile (e.g. with some plugin(s) to be manually
// QA'ed or reviewed)
const testProfile = publicProfile.concat([
  new PluginToBeTested({
    exmapleProp: 'I am still getting reviewed',
  });
]);

datalayer.initialize({
  // instead of passing the plugins directly, we pass our profiles here which then contains
  // the plugins (so nothing fancy here)
  plugins: {
    public: publicProfile,
    testing: testingProfile,
  },
  // define our initial profile (if this is not defined or contains an unknown profile,
  // an error will be thrown during datalayer initialization)
  profile: 'public',
})
```

# Selecting Profiles
If we want to change the current profile on runtime, we can use the `setProfile` method. However, I strongly recommend against switching profiles on-the-fly because of their initialization process. You will likely pollute your DOM or at least have a high risk of incomplete setups/teardowns.
