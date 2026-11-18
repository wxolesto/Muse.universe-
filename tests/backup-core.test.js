import test from "node:test";
import assert from "node:assert/strict";
import { validateBackupPayload, mergeById, mergeArchive, mergePlaylists } from "../src/backup-core.js";

const base = () => ({
  format: "muse-backup", version: 1,
  journal: [{id:"j1",title:"Page",body:"Words",createdAt:10}],
  archive: {soundtrack:[{id:"a1",title:"Song",note:"",createdAt:11}]},
  pixelGallery: [{id:"p1",title:"Art",image:"data:image/png;base64,AA==",createdAt:12,size:32}]
});

test("accepts a valid current backup and older v1 backups with optional sections absent", () => {
  const validated = validateBackupPayload(base());
  assert.equal(validated.journal.length, 1);
  assert.deepEqual(validated.musicTracks, []);
  assert.deepEqual(validated.musicAudio, []);
  assert.deepEqual(validated.libraryItems, []);
});

test("rejects malformed required sections before restore begins", () => {
  const payload = base();
  payload.journal[0].title = 42;
  assert.throws(() => validateBackupPayload(payload), /journal.title/);
});

test("rejects unsafe or malformed media payloads", () => {
  const payload = base();
  payload.pixelGallery[0].image = "data:text/html;base64,PHNjcmlwdD4=";
  assert.throws(() => validateBackupPayload(payload), /image data URL/);
});

test("rejects invalid world object coordinates and unsupported types", () => {
  const payload = base();
  payload.worldObjects = [{id:"w1",type:"tree",x:10,y:Infinity}];
  assert.throws(() => validateBackupPayload(payload), /coordinates/);
});

test("merges by stable ID without deleting unrelated local records", () => {
  const result = mergeById([{id:"one",value:1},{id:"two",value:2}], [{id:"one",value:3},{id:"three",value:4}]);
  assert.deepEqual(result, [{id:"one",value:3},{id:"two",value:2},{id:"three",value:4}]);
});

test("merges archive collections independently", () => {
  const result = mergeArchive({people:[{id:"p1",title:"Old"}]}, {people:[{id:"p1",title:"Updated"},{id:"p2",title:"New"}]});
  assert.deepEqual(result.people, [{id:"p1",title:"Updated"},{id:"p2",title:"New"}]);
  assert.deepEqual(result.memories, []);
});

test("merges playlist memberships instead of dropping existing tracks", () => {
  const result = mergePlaylists([{id:"list",name:"Mix",trackIds:["a"],createdAt:1}], [{id:"list",name:"Mix 2",trackIds:["b"],createdAt:2}]);
  assert.deepEqual(result[0].trackIds, ["a","b"]);
  assert.equal(result[0].name, "Mix 2");
});

test("validates audio media MIME and payload", () => {
  const payload = base();
  payload.musicAudio = [{id:"audio1",name:"song.mp3",type:"audio/mpeg",data:"data:audio/mpeg;base64,AA=="}];
  assert.equal(validateBackupPayload(payload).musicAudio.length, 1);
  payload.musicAudio[0].data = "data:image/png;base64,AA==";
  assert.throws(() => validateBackupPayload(payload), /audio data URL/);
});

test("validates and preserves Library books, movies and series in backups", () => {
  const payload = base();
  payload.libraryItems = [
    {id:"b1",type:"book",title:"A Book",creator:"An Author",status:"finished",rating:5,createdAt:20},
    {id:"m1",type:"movie",title:"A Film",status:"want",cover:"data:image/jpeg;base64,AA==",createdAt:21},
    {id:"s1",type:"series",title:"A Series",status:"in-progress",createdAt:22}
  ];
  const validated = validateBackupPayload(payload);
  assert.equal(validated.libraryItems.length, 3);
  assert.equal(validated.libraryItems[1].type, "movie");
});

test("rejects invalid Library types, statuses, ratings and cover payloads", () => {
  const payload = base();
  payload.libraryItems = [{id:"x1",type:"game",title:"Not a library type",createdAt:1}];
  assert.throws(() => validateBackupPayload(payload), /library item type/);
  payload.libraryItems = [{id:"x1",type:"book",title:"Book",status:"unknown",createdAt:1}];
  assert.throws(() => validateBackupPayload(payload), /library item status/);
  payload.libraryItems = [{id:"x1",type:"book",title:"Book",rating:8,createdAt:1}];
  assert.throws(() => validateBackupPayload(payload), /library item rating/);
  payload.libraryItems = [{id:"x1",type:"book",title:"Book",cover:"data:text/html;base64,AA==",createdAt:1}];
  assert.throws(() => validateBackupPayload(payload), /image data URL/);
});
