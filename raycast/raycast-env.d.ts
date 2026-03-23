/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Supabase URL - Your Supabase project URL */
  "supabaseUrl": string,
  /** Supabase API Key - Your Supabase publishable API key */
  "supabaseKey": string,
  /** Your Name - Select who you are — you can only post statuses as yourself */
  "yourName": "1" | "2" | "3" | "4" | "6"
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `team-status` command */
  export type TeamStatus = ExtensionPreferences & {}
  /** Preferences accessible in the `post-status` command */
  export type PostStatus = ExtensionPreferences & {}
  /** Preferences accessible in the `menu-bar` command */
  export type MenuBar = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `team-status` command */
  export type TeamStatus = {}
  /** Arguments passed to the `post-status` command */
  export type PostStatus = {}
  /** Arguments passed to the `menu-bar` command */
  export type MenuBar = {}
}

