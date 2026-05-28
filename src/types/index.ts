import type { User, Post, Comment, Like, Follow, FriendRequest, Notification, JournalEntry, Group, GroupMember, Page, PageFollow } from '@/generated/prisma/client'

export type UserWithCounts = User & {
  _count: {
    followers: number
    following: number
    posts: number
  }
}

export type PostWithDetails = Post & {
  author: Pick<User, 'id' | 'name' | 'image' | 'username'>
  _count: { likes: number; comments: number }
  likes: Pick<Like, 'userId'>[]
  comments: (Comment & {
    author: Pick<User, 'id' | 'name' | 'image' | 'username'>
    _count: { likes: number }
    likes: Pick<Like, 'userId'>[]
  })[]
}

export type NotificationWithSender = Notification & {
  sender: Pick<User, 'id' | 'name' | 'image' | 'username'> | null
}

export type FriendRequestWithUsers = FriendRequest & {
  sender: Pick<User, 'id' | 'name' | 'image' | 'username'>
  receiver: Pick<User, 'id' | 'name' | 'image' | 'username'>
}

export type PageWithDetails = Page & {
  owner: Pick<User, 'id' | 'name' | 'image' | 'username'>
  _count: { followers: number; posts: number }
  isFollowing: boolean
}

export type GroupWithDetails = Group & {
  owner: Pick<User, 'id' | 'name' | 'image' | 'username'>
  _count: { members: number; posts: number }
  members: (GroupMember & { user: Pick<User, 'id' | 'name' | 'image' | 'username'> })[]
  myMembership: Pick<GroupMember, 'role' | 'status'> | null
}

export type { User, Post, Comment, Like, Follow, FriendRequest, Notification, JournalEntry, Group, GroupMember, Page, PageFollow }
