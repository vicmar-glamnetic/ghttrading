import { redirect } from 'next/navigation'

// The Feed is the default landing page.
export default function Home() {
  redirect('/feed')
}
